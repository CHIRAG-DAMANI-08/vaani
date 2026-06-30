import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "@clerk/backend";
import { connectToDatabase } from "./src/lib/mongodb";
import { User } from "./src/lib/models/user";
import { Channel } from "./src/lib/models/channel";
import { Session } from "./src/lib/models/session";
import { runPipeline } from "./src/lib/sarvam-pipeline";
import { sessionManager } from "./src/lib/stream-session";
import { RTMPStreamer, type ChannelRTMPConfig, type RTMPStreamerSnapshot } from "./src/lib/rtmp-streamer";
import NodeMediaServer from "node-media-server";
import { spawn, ChildProcess } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { logger } from "./src/lib/logger";
import { decryptKey } from "./src/lib/encryption";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Validate environment variables
const REQUIRED_ENV_VARS = [
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "MONGODB_URI",
  "ENCRYPTION_KEY"
];

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    logger.fatal({ envVar }, "Missing required environment variable");
    process.exit(1);
  }
}

if (process.env.ENCRYPTION_KEY?.length !== 64) {
  logger.fatal("ENCRYPTION_KEY must be a 64-character hex string");
  process.exit(1);
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Helper to decrypt password / sarvam key — delegates to shared encryption module
function decryptValue(encryptedStr: string | null | undefined): string | null {
  if (!encryptedStr) return null;
  try {
    return decryptKey(encryptedStr);
  } catch (err) {
    logger.error({ err }, "Failed to decrypt value");
    return null;
  }
}

// In-memory connection state registry per user
const activeSessions = new Map<string, WebSocket>();

// Per-user RTMP streamers — manages FFmpeg processes
const activeStreamers = new Map<string, RTMPStreamer>();

// Track OBS connected status globally so Next.js API can read it
// Ensure it's not redefined on hot-reloads
const globalAny: any = global;
export const activeObsStatus = globalAny.activeObsStatus || new Map<string, { obsConnected: boolean; lastSeen: number }>();
globalAny.activeObsStatus = activeObsStatus;

const userTranslationSources = new Map<string, string>();
const userTTSSettings = new Map<string, { speaker: string; pace: number; sourceLang: string }>();

// Active audio extractor FFmpeg processes (Native RTMP)
const activeAudioExtractors = new Map<string, ChildProcess>();

// ── Per-User Pipeline Queue ────────────────────────────────────────────────
// Prevents parallel chunk processing which causes out-of-order translations
// and Sarvam API rate limit exhaustion.

type UserPipelineState = {
  queue: Array<{ audioBase64: string; seq: number }>;
  processing: boolean;
  nextSeq: number;
  // Cached per-session to avoid DB query every 3 seconds
  cachedApiKey: string | null;
  cachedLanguages: string[] | null;
  cacheTimestamp: number;
  // Monotonically increasing generation. When a session is cleared/restarted,
  // the epoch is bumped so any in-flight drain loop holding a stale reference
  // can detect the mismatch and bail instead of pushing results into a dead session.
  epoch: number;
};

const userPipelineQueues = new Map<string, UserPipelineState>();
const CACHE_TTL_MS = 60_000; // Re-fetch from DB every 60s
const MAX_QUEUE_SIZE = 10; // Drop oldest chunks if queue backs up

function getPipelineState(userId: string): UserPipelineState {
  if (!userPipelineQueues.has(userId)) {
    userPipelineQueues.set(userId, {
      queue: [],
      processing: false,
      nextSeq: 0,
      cachedApiKey: null,
      cachedLanguages: null,
      cacheTimestamp: 0,
      epoch: 0,
    });
  }
  return userPipelineQueues.get(userId)!;
}

function clearPipelineState(userId: string) {
  const cur = userPipelineQueues.get(userId);
  // Replace (not delete) with a fresh state at epoch+1. A stale drain-loop
  // reference will see its captured epoch no longer match the live epoch via
  // currentEpochOf() and bail. We avoid `delete` so concurrent code that calls
  // getPipelineState right after still gets a valid (empty) object.
  userPipelineQueues.set(userId, {
    queue: [],
    processing: false,
    nextSeq: 0,
    cachedApiKey: null,
    cachedLanguages: null,
    cacheTimestamp: 0,
    epoch: cur ? cur.epoch + 1 : 0,
  });
}

/** Read the live epoch for a userId without creating state. */
function currentEpochOf(userId: string): number {
  return userPipelineQueues.get(userId)?.epoch ?? -1;
}

async function saveSessionToDb(userId: string, sessionData: any) {
  try {
    if (sessionData.durationMs && sessionData.durationMs > 0) {
      await connectToDatabase();
      await Session.create({
        clerkId: userId,
        startedAt: new Date(sessionData.startedAt),
        endedAt: new Date(sessionData.startedAt + sessionData.durationMs),
        durationMs: sessionData.durationMs,
        activeLanguages: sessionData.activeLanguages,
        chunksProcessed: sessionData.chunksProcessed,
        estimatedCostINR: sessionData.estimatedCostINR,
        transcript: sessionData.fullTranscript,
      });
      logger.info({ userId }, "Session saved to DB");
    }
  } catch (err) {
    logger.error({ err, userId }, "Failed to save session to DB");
  }
}

// ── Pipeline Processing Loop ───────────────────────────────────────────────

/** Enqueue an audio chunk for serial processing. Never processes in parallel. */
function processAudioChunk(
  userId: string,
  audioBase64: string,
  ws: WebSocket | undefined
) {
  if (!sessionManager.isActive(userId)) return;

  const state = getPipelineState(userId);
  const seq = state.nextSeq++;

  // Backpressure: if the queue is full, drop the oldest chunk
  if (state.queue.length >= MAX_QUEUE_SIZE) {
    const dropped = state.queue.shift();
    logger.warn({ userId, droppedSeq: dropped?.seq }, "Pipeline queue full, dropped chunk");
  }

  state.queue.push({ audioBase64, seq });

  // If not already processing, kick off the drain loop
  if (!state.processing) {
    drainPipelineQueue(userId, ws);
  }
}

/** Serial drain loop — processes one chunk at a time, in order. */
async function drainPipelineQueue(userId: string, ws: WebSocket | undefined) {
  const state = getPipelineState(userId);
  if (state.processing) return;
  state.processing = true;
  // Capture the epoch at start. If clearPipelineState bumps the live epoch
  // (e.g. session stopped + restarted), this loop is stale and must stop.
  const startEpoch = state.epoch;

  while (state.queue.length > 0 && sessionManager.isActive(userId)) {
    if (currentEpochOf(userId) !== startEpoch) {
      logger.info({ userId, startEpoch, liveEpoch: currentEpochOf(userId) }, "Pipeline drain superseded by session restart — stopping");
      state.processing = false;
      return;
    }
    const item = state.queue.shift()!;
    try {
      await executeChunkPipeline(userId, item.audioBase64, item.seq, ws);
    } catch (err) {
      logger.error({ err, userId, seq: item.seq }, "Chunk pipeline failed");
      sessionManager.setError(userId, err instanceof Error ? err.message : "Pipeline failed");
      sendToClient(ws, {
        type: "PIPELINE_ERROR",
        error: err instanceof Error ? err.message : "Pipeline processing failed",
      });
    }
  }

  // Only clear the processing flag if we still own this epoch.
  if (currentEpochOf(userId) === startEpoch) {
    state.processing = false;
  }
}

/** Resolve API key + languages from cache or DB. */
async function getCachedCredentials(userId: string): Promise<{ apiKey: string; languages: string[] } | null> {
  const state = getPipelineState(userId);
  const now = Date.now();

  if (state.cachedApiKey && state.cachedLanguages && (now - state.cacheTimestamp) < CACHE_TTL_MS) {
    return { apiKey: state.cachedApiKey, languages: state.cachedLanguages };
  }

  // Cache miss — hit DB
  await connectToDatabase();
  const user = await User.findOne({ clerkId: userId }).lean();
  if (!user?.sarvamKeyEnc) return null;

  const apiKey = decryptValue(user.sarvamKeyEnc);
  if (!apiKey) return null;

  const channels = await Channel.find({ clerkId: userId, enabled: true }).lean();
  const languages = channels.map((ch: any) => ch.languageId);
  if (languages.length === 0) return null;

  // Update cache
  state.cachedApiKey = apiKey;
  state.cachedLanguages = languages;
  state.cacheTimestamp = now;

  return { apiKey, languages };
}

/** Execute a single chunk through STT → Translate → TTS. Always called serially. */
async function executeChunkPipeline(
  userId: string,
  audioBase64: string,
  seq: number,
  ws: WebSocket | undefined
) {
  const chunkLogger = logger.child({ userId, seq });
  chunkLogger.debug({ audioBytes: Buffer.from(audioBase64, "base64").length }, "Chunk pipeline started");

  // 1. Resolve credentials (cached)
  const creds = await getCachedCredentials(userId);
  if (!creds) {
    sendToClient(ws, {
      type: "PIPELINE_ERROR",
      error: "No Sarvam API key or channels configured.",
    });
    return;
  }

  // 2. Convert base64 audio to Buffer
  const audioBuffer = Buffer.from(audioBase64, "base64");

  // 3. Run the pipeline with real-time stage updates
  const ttsOpts = userTTSSettings.get(userId) || { speaker: "shubh", pace: 1.0, sourceLang: "auto" };
  const pipelineOpts = {
    speaker: ttsOpts.speaker,
    pace: ttsOpts.pace,
    sourceLang: ttsOpts.sourceLang !== "auto" ? ttsOpts.sourceLang : undefined,
  };

  const result = await runPipeline(
    audioBuffer,
    creds.apiKey,
    creds.languages,
    (stage, status, data) => {
      sessionManager.updateStage(
        userId,
        stage as any,
        status,
        data?.time ? `${(data.time / 1000).toFixed(1)}s` : undefined
      );
      sendToClient(ws, {
        type: "PIPELINE_STAGE_UPDATE",
        stage,
        status,
        data,
      });
    },
    pipelineOpts
  );

  // 4. Record stats
  if (result.stt?.transcript) {
    sessionManager.addTranscriptLine(userId, result.stt.transcript);
    sessionManager.recordChunkProcessed(userId, creds.languages.length);
  }

  if (result.timings?.total) {
    sessionManager.recordLatency(userId, result.timings.total);
  }

  if (result.error) {
    sessionManager.setError(userId, result.error);
  }

  // 5. Push TTS audio to RTMP streamer
  const streamer = activeStreamers.get(userId);
  if (streamer?.active && result.ttsOutputs.length > 0) {
    for (const ttsOutput of result.ttsOutputs) {
      if (ttsOutput.audioBase64) {
        streamer.pushAudio(ttsOutput.audioBase64);
      }
    }
    sessionManager.updateStage(userId, "stream", "done", `${result.ttsOutputs.length} ch`);
  }

  // 6. Push full result to client (with sequence number for ordering)
  sendToClient(ws, {
    type: "PIPELINE_RESULT",
    seq,
    transcript: result.stt?.transcript || "",
    translations: result.translations.map((t) => ({
      language: t.targetLanguage,
      text: t.translatedText,
    })),
    ttsCount: result.ttsOutputs.length,
    timings: result.timings,
    error: result.error,
  });

  // 7. Log pipeline completion
  chunkLogger.info(
    {
      transcriptLen: result.stt?.transcript?.length || 0,
      translations: result.translations.length,
      ttsCount: result.ttsOutputs.length,
      totalMs: result.timings?.total || 0,
      error: result.error,
    },
    "Chunk pipeline completed"
  );

  // 8. Push updated session snapshot
  const rtmpSnapshot = activeStreamers.get(userId)?.getSnapshot();
  sendToClient(ws, {
    type: "SESSION_SNAPSHOT",
    ...sessionManager.getSnapshot(userId),
    rtmp: rtmpSnapshot || { active: false, channels: [] },
  });
}

function sendToClient(ws: WebSocket | undefined, msg: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ── Audio Extraction for Native RTMP ───────────────────────────────────────

// Utility to generate a valid WAV header for raw PCM data
function createWavHeader(dataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number) {
  const buffer = Buffer.alloc(44);
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

function startAudioExtraction(userId: string) {
  if (activeAudioExtractors.has(userId)) return;

  logger.info({ userId }, "Audio extraction starting");
  const rtmpUrl = `rtmp://localhost:1935/live/${userId}`;
  
  const sourcePref = userTranslationSources.get(userId) || "mic_only";
  let channelMapArgs = ["-ac", "1"]; // mixed
  if (sourcePref === "mic_only") {
    channelMapArgs = ["-af", "pan=mono|c0=c1"]; // Extract Right channel
  } else if (sourcePref === "desktop_only") {
    channelMapArgs = ["-af", "pan=mono|c0=c0"]; // Extract Left channel
  }

  // @ts-ignore
  const ffmpegExec = ffmpegPath || "ffmpeg";
  const ffmpeg = spawn(ffmpegExec, [
    "-hide_banner", "-loglevel", "error",
    "-i", rtmpUrl,
    "-vn", // No video
    "-f", "s16le", // Raw PCM 16-bit little-endian
    "-ar", "16000", // 16 kHz (expected by Sarvam)
    ...channelMapArgs,
    "pipe:1" // Output to stdout
  ]);

  let chunkBuffer = Buffer.alloc(0);
  // Increase chunk size to 3 seconds. 1 second is too short for Sarvam's saarika model
  // to establish context, leading to aggressive hallucination of random words.
  const CHUNK_SIZE = 32000 * 3; // 3 seconds of 16kHz 16-bit mono

  ffmpeg.stdout.on("data", (data) => {
    chunkBuffer = Buffer.concat([chunkBuffer, data]);
    while (chunkBuffer.length >= CHUNK_SIZE) {
      const chunk = chunkBuffer.subarray(0, CHUNK_SIZE);
      chunkBuffer = chunkBuffer.subarray(CHUNK_SIZE);
      
      // Calculate RMS and Zero-Crossing Rate to detect silence and non-speech (Voice Activity Detection)
      let sumSquares = 0;
      let zeroCrossings = 0;
      let prevSample = 0;
      for (let i = 0; i < chunk.length; i += 2) {
        const sample = chunk.readInt16LE(i);
        sumSquares += sample * sample;
        if (i > 0) {
           if ((sample >= 0 && prevSample < 0) || (sample < 0 && prevSample >= 0)) {
               zeroCrossings++;
           }
        }
        prevSample = sample;
      }
      const rms = Math.sqrt(sumSquares / (chunk.length / 2));

      // Determine VAD decision
      const isSpeech = rms >= 150 && zeroCrossings >= 100;
      const vadStatus = rms < 150 ? "silent" : zeroCrossings < 100 ? "noise" : "speech";

      // Send audio level + VAD to frontend for visualization
      const ws = activeSessions.get(userId);
      sendToClient(ws, {
        type: "AUDIO_LEVEL",
        rms: Math.round(rms),
        zcr: zeroCrossings,
        vadStatus, // "speech" | "silent" | "noise"
        bufferPercent: Math.min(100, Math.round((chunkBuffer.length / CHUNK_SIZE) * 100)),
      });

      // If audio is below RMS threshold or has too few zero crossings, skip STT to prevent hallucination
      if (!isSpeech) {
        continue;
      }

      // Wrap raw PCM chunk with a proper WAV header so Sarvam API can read it
      const wavHeader = createWavHeader(chunk.length, 16000, 1, 16);
      const wavBuffer = Buffer.concat([wavHeader, chunk]);

      // Convert WAV to base64 for the pipeline
      const audioBase64 = wavBuffer.toString("base64");
      processAudioChunk(userId, audioBase64, ws);
    }
  });

  ffmpeg.stderr.on("data", (data) => {
    logger.error({ userId, error: data.toString() }, "Audio extraction error");
  });

  ffmpeg.on("close", (code) => {
    logger.info({ userId, code }, "Audio extraction stopped");
    activeAudioExtractors.delete(userId);
  });

  activeAudioExtractors.set(userId, ffmpeg);
}

function stopAudioExtraction(userId: string) {
  const ffmpeg = activeAudioExtractors.get(userId);
  if (ffmpeg) {
    logger.info({ userId }, "Audio extraction stopping");
    ffmpeg.kill("SIGTERM");
    // SIGKILL fallback after 3s if SIGTERM doesn't work
    setTimeout(() => {
      try {
        ffmpeg.kill("SIGKILL");
      } catch {
        // already dead
      }
    }, 3000);
    activeAudioExtractors.delete(userId);
  }
}

// ── Server Setup ───────────────────────────────────────────────────────────

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      logger.error({ err, url: req.url }, "Request handler error");
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // ── RTMP Ingest Server Setup ──
  const nmsConfig = {
    rtmp: {
      port: 1935,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60
    }
  };
  const nms = new NodeMediaServer(nmsConfig);
  nms.run();

  nms.on('postPublish', (...args: any[]) => {
    logger.debug({ argCount: args.length, argTypes: args.map((a: any) => typeof a) }, "postPublish event");
    
    // We will extract the stream key reliably
    let streamKey = '';
    if (typeof args[1] === 'string') {
        streamKey = args[1].split('/').pop() || '';
    } else if (args[0] && typeof args[0] === 'string') {
        streamKey = args[0];
    } else if (args[1] && args[1].streamPath) {
        streamKey = args[1].streamPath.split('/').pop() || '';
    } else if (args[0] && typeof args[0].id === 'string') {
        // NMS v4 session object?
        // the property for stream name is often 'streamName' or 'StreamPath'
        if (args[0].streamName) streamKey = args[0].streamName;
        else if (args[0].client && args[0].client.streamName) streamKey = args[0].client.streamName;
        else streamKey = args[0].id; // fallback
    }

    logger.debug({ streamKey }, "Extracted stream key");
    const userId = streamKey;
    if (userId) {
      // Authentication: reject publishes from unauthenticated stream keys.
      // The stream key IS the Clerk user ID (shown in Stream Settings). An
      // attacker on port 1935 can guess a victim's Clerk ID; without this check
      // they start a session as that user, burning quota and pushing attacker
      // audio to the victim's RTMP destinations. Only accept publishes whose
      // stream key maps to a currently-authenticated dashboard WebSocket.
      const ws = activeSessions.get(userId);
      if (!ws) {
        logger.warn({ userId }, "RTMP publish rejected: no authenticated dashboard session for this stream key");
        return;
      }
      handleGoLive(userId, ws);
      startAudioExtraction(userId);
    }
  });

  nms.on('donePublish', (...args: any[]) => {
    let streamKey = '';
    if (typeof args[1] === 'string') {
        streamKey = args[1].split('/').pop() || '';
    } else if (args[0] && typeof args[0] === 'string') {
        streamKey = args[0];
    } else if (args[1] && args[1].streamPath) {
        streamKey = args[1].streamPath.split('/').pop() || '';
    } else if (args[0] && typeof args[0].id === 'string') {
        if (args[0].streamName) streamKey = args[0].streamName;
        else if (args[0].client && args[0].client.streamName) streamKey = args[0].client.streamName;
        else streamKey = args[0].id;
    }

    logger.debug({ streamKey }, "donePublish event");
    const userId = streamKey;
    if (userId) {
      stopAudioExtraction(userId);
      const ws = activeSessions.get(userId);
      if (ws && sessionManager.isActive(userId)) {
        const streamer = activeStreamers.get(userId);
        if (streamer) {
          streamer.stop();
          activeStreamers.delete(userId);
        }
        const session = sessionManager.stopSession(userId);
        saveSessionToDb(userId, session);
        sendToClient(ws, {
          type: "SESSION_STOPPED",
          reason: "OBS stream ended",
          ...sessionManager.getSnapshot(userId),
        });
      }
    }
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 1 * 1024 * 1024 });

  server.on("upgrade", async (req, socket, head) => {
    const { pathname } = parse(req.url || "/", true);

    if (pathname === "/ws/relay") {
      // Origin validation
      const origin = req.headers.origin;
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3000",
        "https://localhost:3000",
      ];
      if (origin && !allowedOrigins.includes(origin)) {
        logger.warn({ origin }, "WebSocket rejected: disallowed origin");
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      try {
        const protocols = req.headers["sec-websocket-protocol"];
        const protocolList = Array.isArray(protocols)
          ? protocols
          : (protocols?.split(",").map((p: string) => p.trim()) || []);
        
        // Find the JWT token — skip known protocol identifiers
        const sessionToken = protocolList.find(
          (p: string) => p !== "vaani-relay-v1" && p.includes(".")
        );

        if (!sessionToken || !process.env.CLERK_SECRET_KEY) {
          logger.warn("WebSocket auth missing");
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        try {
          const payload = await verifyToken(sessionToken, {
            secretKey: process.env.CLERK_SECRET_KEY,
            audience: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
          });

          if (!payload) {
            logger.warn("WebSocket invalid session token");
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
          }
          
          const userId = typeof payload.sub === 'string' ? payload.sub : String(payload.sub);
          
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req, userId);
          });
        } catch (authError) {
          logger.error({ err: authError }, "WebSocket auth error");
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
        }
      } catch (err) {
        logger.error({ err }, "Upgrade handler exception");
        socket.destroy();
      }
    } 
    // Internal Next.js HMR and other upgrades are handled by the dev server automatically
    // as long as we don't explicitly destroy the socket here.
  });

  wss.on("connection", async (ws: WebSocket, req: any, userId: string) => {
    activeSessions.set(userId, ws);
    logger.info({ userId }, "WS connected");

    // Send credentials to client
    try {
      await connectToDatabase();
      const user = await User.findOne({ clerkId: userId }).lean();
      
      if (user && user.obsHost) {
        const password = decryptValue(user.obsPasswordEnc) || "";
        ws.send(
          JSON.stringify({
            type: "OBS_CREDENTIALS",
            host: user.obsHost,
            port: user.obsPort,
            password,
          })
        );
      }

      // Send current session snapshot if there's an active session
      if (sessionManager.isActive(userId)) {
        const rtmpSnap = activeStreamers.get(userId)?.getSnapshot();
        sendToClient(ws, {
          type: "SESSION_SNAPSHOT",
          ...sessionManager.getSnapshot(userId),
          rtmp: rtmpSnap || { active: false, channels: [] },
        });
      }
    } catch (e) {
      logger.error({ err: e, userId }, "Failed to fetch OBS credentials");
    }

    // Ping loop
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "PING" }));
      }
    }, 30000);

    let lastPong = Date.now();
    
    // Check for pong timeouts
    const pongCheckInterval = setInterval(() => {
      if (Date.now() - lastPong > 45000) {
        // Disconnect if no PONG within timeout window
        logger.warn({ userId }, "PONG timeout");
        ws.close(1001, "PONG_TIMEOUT");
      }
    }, 5000);

    // ── Session snapshot push interval (every 1s while streaming) ──
    const snapshotInterval = setInterval(() => {
      if (sessionManager.isActive(userId) && ws.readyState === WebSocket.OPEN) {
        const rtmpSnap = activeStreamers.get(userId)?.getSnapshot();
        sendToClient(ws, {
          type: "SESSION_SNAPSHOT",
          ...sessionManager.getSnapshot(userId),
          rtmp: rtmpSnap || { active: false, channels: [] },
        });
      }
    }, 1000);

    ws.on("message", (rawMsg: any, isBinary: boolean) => {
      // Binary messages are raw audio chunks from the browser
      if (isBinary) {
        if (sessionManager.isActive(userId)) {
          // Convert binary Buffer to base64 for the pipeline (internal format)
          const audioBase64 = Buffer.from(rawMsg).toString("base64");
          processAudioChunk(userId, audioBase64, ws);
        }
        return;
      }

      // Text messages are JSON commands
      try {
        const msg = JSON.parse(rawMsg.toString());

        if (msg.type === "PONG") {
          lastPong = Date.now();

        } else if (msg.type === "OBS_CONNECTED") {
          activeObsStatus.set(userId, { obsConnected: true, lastSeen: Date.now() });
          logger.info({ userId }, "OBS connected");

        } else if (msg.type === "OBS_DISCONNECTED") {
          activeObsStatus.set(userId, { obsConnected: false, lastSeen: Date.now() });
          logger.info({ userId, reason: msg.reason }, "OBS disconnected");

          // Auto-stop session if OBS disconnects during streaming
          if (sessionManager.isActive(userId)) {
            // Stop RTMP streamer first
            const streamer = activeStreamers.get(userId);
            if (streamer) {
              streamer.stop();
              activeStreamers.delete(userId);
            }
            const session = sessionManager.stopSession(userId);
            saveSessionToDb(userId, session);
            clearPipelineState(userId);
            sendToClient(ws, {
              type: "SESSION_STOPPED",
              reason: "OBS disconnected",
              ...sessionManager.getSnapshot(userId),
            });
            logger.info({ userId, reason: "OBS disconnected" }, "Session auto-stopped");
          }

        } else if (msg.type === "GO_LIVE") {
          // Start a new streaming session
          logger.info({ userId }, "GO_LIVE requested");
          handleGoLive(userId, ws);

        } else if (msg.type === "STOP_STREAM") {
          // Stop the streaming session
          logger.info({ userId }, "STOP_STREAM requested");
          // Stop RTMP streamer
          const streamer = activeStreamers.get(userId);
          if (streamer) {
            streamer.stop();
            activeStreamers.delete(userId);
          }
          const session = sessionManager.stopSession(userId);
          saveSessionToDb(userId, session);
          clearPipelineState(userId);
          sendToClient(ws, {
            type: "SESSION_STOPPED",
            reason: "User stopped",
            ...sessionManager.getSnapshot(userId),
          });

        } else if (msg.type === "AUDIO_CHUNK") {
          // Legacy: Base64 JSON audio chunks (backward compatibility)
          if (sessionManager.isActive(userId) && msg.audio) {
            processAudioChunk(userId, msg.audio, ws);
          }

        } else if (msg.type === "OBS_EVENT") {
          logger.debug({ userId, event: msg.event }, "OBS event");

        } else if (msg.type === "SET_TRANSLATION_SOURCE") {
          logger.info({ userId, source: msg.source }, "Translation source set");
          userTranslationSources.set(userId, msg.source);
          
          // If already streaming, hot-reload the audio extractor so settings apply immediately
          if (activeAudioExtractors.has(userId)) {
            logger.info({ userId }, "Audio extraction hot-reload");
            stopAudioExtraction(userId);
            setTimeout(() => {
              if (sessionManager.isActive(userId)) {
                startAudioExtraction(userId);
              }
            }, 1000); // 1s delay to let previous FFmpeg die cleanly
          }
        } else if (msg.type === "SET_TTS_SETTINGS") {
          logger.debug({ userId, speaker: msg.speaker, pace: msg.pace, sourceLang: msg.sourceLang }, "TTS settings set");
          userTTSSettings.set(userId, {
            speaker: msg.speaker || "shubh",
            pace: msg.pace || 1.0,
            sourceLang: msg.sourceLang || "auto",
          });
        }
      } catch (e) {
        // Ignore invalid parses
      }
    });

    ws.on("close", () => {
      logger.info({ userId }, "WS closed");
      activeSessions.delete(userId);
      clearInterval(pingInterval);
      clearInterval(pongCheckInterval);
      clearInterval(snapshotInterval);

      // Stop RTMP streamer and session if WS closes
      const streamer = activeStreamers.get(userId);
      if (streamer) {
        streamer.stop();
        activeStreamers.delete(userId);
      }
      if (sessionManager.isActive(userId)) {
        const session = sessionManager.stopSession(userId);
        saveSessionToDb(userId, session);
        clearPipelineState(userId);
      }
    });
    
    ws.on("error", (err: Error) => {
      logger.error({ err, userId }, "WS error");
    });
  });

  server.listen(port, () => {
    logger.info({ hostname, port }, "Server ready");
  });

  // ── Periodic Stale State Cleanup ──────────────────────────────────────────
  const STALE_TTL_MS = 60 * 60 * 1000; // 1 hour
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const staleCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [userId, ws] of activeSessions.entries()) {
      if (ws.readyState !== WebSocket.OPEN) {
        activeSessions.delete(userId);
        logger.debug({ userId }, "Cleaned up stale session");
      }
    }
    for (const [userId] of activeStreamers.entries()) {
      if (!sessionManager.isActive(userId)) {
        activeStreamers.delete(userId);
        logger.debug({ userId }, "Cleaned up stale streamer");
      }
    }
    for (const [userId, state] of userPipelineQueues.entries()) {
      if (!state.processing && state.queue.length === 0 && (now - state.cacheTimestamp) > STALE_TTL_MS) {
        userPipelineQueues.delete(userId);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't keep the event loop alive just for cleanup
  staleCleanupInterval.unref();

  // ── Graceful Shutdown ──────────────────────────────────────────────────────
  function gracefulShutdown() {
    logger.info("Graceful shutdown initiated");
    
    // 1. Stop all active RTMP streamers (FFmpeg processes)
    for (const [userId, streamer] of activeStreamers.entries()) {
      logger.info({ userId }, "Stopping RTMP streamer");
      streamer.stop();
    }
    
    // 2. Stop all active audio extractors (FFmpeg processes)
    for (const [userId, process] of activeAudioExtractors.entries()) {
      logger.info({ userId }, "Stopping audio extractor");
      process.kill("SIGTERM");
    }

    // 3. Stop Node Media Server
    if (nms) {
      logger.info("Stopping NMS");
      try {
        if (typeof (nms as any).stop === "function") {
          (nms as any).stop();
        } else if (typeof (nms as any).close === "function") {
          (nms as any).close();
        }
      } catch {
        // NMS v4 doesn't always expose a clean stop method
      }
    }

    // 4. Close servers
    wss.close(() => {
      server.close(() => {
        logger.info("Servers closed");
        process.exit(0);
      });
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  }

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
});

// ── Go Live Handler ────────────────────────────────────────────────────────

async function handleGoLive(userId: string, ws?: WebSocket) {
  try {
    // If this user already has an active session/streamer (e.g. a duplicate
    // RTMP publish or a reconnect race), tear the old one down before
    // starting a new one. Otherwise the previous FFmpeg process and its
    // audioInterval leak forever and the previous session transcript is
    // silently discarded.
    if (activeStreamers.has(userId)) {
      logger.warn({ userId }, "handleGoLive: stopping existing streamer before restart");
      activeStreamers.get(userId)!.stop();
      activeStreamers.delete(userId);
    }
    stopAudioExtraction(userId);
    if (sessionManager.isActive(userId)) {
      const prevSession = sessionManager.stopSession(userId);
      saveSessionToDb(userId, prevSession);
      clearPipelineState(userId);
    }

    await connectToDatabase();

    // Verify user has Sarvam key
    const user = await User.findOne({ clerkId: userId }).lean();
    if (!user?.sarvamKeyEnc) {
      sendToClient(ws, {
        type: "GO_LIVE_ERROR",
        error: "No Sarvam API key configured. Add one in Settings.",
      });
      return;
    }

    // Verify at least one channel is enabled
    const channels = await Channel.find({
      clerkId: userId,
      enabled: true,
    }).lean();

    if (channels.length === 0) {
      sendToClient(ws, {
        type: "GO_LIVE_ERROR",
        error: "No enabled channels. Enable at least one language in Channels.",
      });
      return;
    }

    const languages = channels.map((ch: any) => ch.languageId);

    // ── Initialize RTMP Streamer ──────────────────────────────────────
    // Build RTMP configs from channels that have both rtmpUrl and rtmpKey
    const rtmpConfigs: ChannelRTMPConfig[] = [];
    for (const ch of channels) {
      const chAny = ch as any;
      if (chAny.rtmpUrl && chAny.rtmpKey) {
        // Decrypt RTMP key if it looks encrypted (contains ":" separators)
        let rtmpKey = chAny.rtmpKey;
        if (rtmpKey.includes(":")) {
          const decrypted = decryptValue(rtmpKey);
          if (decrypted) rtmpKey = decrypted;
        }

        rtmpConfigs.push({
          channelId: chAny._id.toString(),
          languageId: chAny.languageId,
          languageName: chAny.languageName,
          rtmpUrl: chAny.rtmpUrl,
          rtmpKey,
        });
      }
    }

    // Start RTMP streamer if any channels have RTMP configs
    if (rtmpConfigs.length > 0) {
      const streamer = new RTMPStreamer();

      // Listen for streamer events
      streamer.on("error", (err: Error) => {
        logger.error({ err: err.message, userId }, "RTMP streamer error");
        sendToClient(ws, {
          type: "RTMP_ERROR",
          error: err.message,
        });
      });

      streamer.on("stopped", () => {
        logger.info({ userId }, "RTMP stopped");
      });

      streamer.on("channel-error", (channelId: string, error: string) => {
        sendToClient(ws, {
          type: "RTMP_CHANNEL_ERROR",
          channelId,
          error,
        });
      });

      const ingestUrl = `rtmp://localhost:1935/live/${userId}`;
      const started = streamer.start(rtmpConfigs, ingestUrl);
      if (started) {
        activeStreamers.set(userId, streamer);
        logger.info({ userId, destinations: rtmpConfigs.length }, "RTMP streamer started");

        // Update stream stage
        sessionManager.updateStage(userId, "stream", "active", "Connecting...");
      } else {
        logger.warn({ userId }, "RTMP streamer failed to start");
        sessionManager.updateStage(userId, "stream", "error", "FFmpeg failed");
      }
    } else {
      logger.info({ userId }, "Pipeline-only mode");
      sessionManager.updateStage(userId, "stream", "idle", "No RTMP");
    }

    // Start the session
    sessionManager.startSession(userId, languages);

    const rtmpSnap = activeStreamers.get(userId)?.getSnapshot();
    sendToClient(ws, {
      type: "SESSION_STARTED",
      languages,
      ...sessionManager.getSnapshot(userId),
      rtmp: rtmpSnap || { active: false, channels: [] },
    });

    logger.info({ userId, languages: languages.join(", ") }, "Session started");
  } catch (err) {
    logger.error({ err, userId }, "GO_LIVE failed");
    sendToClient(ws, {
      type: "GO_LIVE_ERROR",
      error: "Failed to start session. Please try again.",
    });
  }
}
