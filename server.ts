import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "@clerk/backend";
import { connectToDatabase } from "./src/lib/mongodb";
import { User } from "./src/lib/models/user";
import { Channel } from "./src/lib/models/channel";
import crypto from "crypto";
import { runPipeline } from "./src/lib/sarvam-pipeline";
import { sessionManager } from "./src/lib/stream-session";
import { RTMPStreamer, type ChannelRTMPConfig, type RTMPStreamerSnapshot } from "./src/lib/rtmp-streamer";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Helper to decrypt password / sarvam key
function decryptValue(encryptedStr: string): string | null {
  if (!encryptedStr) return null;
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    console.error("Missing or invalid ENCRYPTION_KEY string.");
    return null;
  }
  try {
    const key = Buffer.from(keyHex, "hex");
    const [ivB64, authTagB64, ciphertextB64] = encryptedStr.split(":");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let plaintext = decipher.update(ciphertext, undefined, "utf8");
    plaintext += decipher.final("utf8");
    return plaintext;
  } catch (err) {
    console.error("Failed to decrypt value:", err);
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

// ── Pipeline Processing Queue ──────────────────────────────────────────────

/** Process audio chunk through the full Sarvam pipeline and push results back */
async function processAudioChunk(
  userId: string,
  audioBase64: string,
  ws: WebSocket
) {
  if (!sessionManager.isActive(userId)) return;

  try {
    // 1. Fetch user's Sarvam key
    await connectToDatabase();
    const user = await User.findOne({ clerkId: userId }).lean();
    if (!user?.sarvamKeyEnc) {
      sendToClient(ws, {
        type: "PIPELINE_ERROR",
        error: "No Sarvam API key configured",
      });
      return;
    }

    const apiKey = decryptValue(user.sarvamKeyEnc);
    if (!apiKey) {
      sendToClient(ws, {
        type: "PIPELINE_ERROR",
        error: "Failed to decrypt Sarvam API key",
      });
      return;
    }

    // 2. Get active channel languages
    const channels = await Channel.find({
      clerkId: userId,
      enabled: true,
    }).lean();
    const targetLanguages = channels.map((ch: any) => ch.languageId);

    if (targetLanguages.length === 0) {
      sendToClient(ws, {
        type: "PIPELINE_ERROR",
        error: "No enabled channels. Enable at least one language channel.",
      });
      return;
    }

    // 3. Convert base64 audio to Buffer
    const audioBuffer = Buffer.from(audioBase64, "base64");

    // 4. Run the pipeline with real-time stage updates
    const result = await runPipeline(
      audioBuffer,
      apiKey,
      targetLanguages,
      (stage, status, data) => {
        // Push stage updates to client in real-time
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
      }
    );

    // 5. Record stats
    if (result.stt?.transcript) {
      sessionManager.addTranscriptLine(userId, result.stt.transcript);
      sessionManager.recordChunkProcessed(userId, targetLanguages.length);
    }

    // 5b. Record pipeline latency
    if (result.timings?.total) {
      sessionManager.recordLatency(userId, result.timings.total);
    }

    if (result.error) {
      sessionManager.setError(userId, result.error);
    }

    // 6. Push TTS audio to RTMP streamer
    const streamer = activeStreamers.get(userId);
    if (streamer?.active && result.ttsOutputs.length > 0) {
      for (const ttsOutput of result.ttsOutputs) {
        if (ttsOutput.audioBase64) {
          streamer.pushAudio(ttsOutput.audioBase64);
        }
      }
      // Update stream stage with RTMP status
      sessionManager.updateStage(userId, "stream", "done", `${result.ttsOutputs.length} ch`);
    }

    // 7. Push full result to client
    sendToClient(ws, {
      type: "PIPELINE_RESULT",
      transcript: result.stt?.transcript || "",
      translations: result.translations.map((t) => ({
        language: t.targetLanguage,
        text: t.translatedText,
      })),
      ttsCount: result.ttsOutputs.length,
      timings: result.timings,
      error: result.error,
    });

    // 8. Push updated session snapshot (with RTMP status)
    const rtmpSnapshot = activeStreamers.get(userId)?.getSnapshot();
    sendToClient(ws, {
      type: "SESSION_SNAPSHOT",
      ...sessionManager.getSnapshot(userId),
      rtmp: rtmpSnapshot || { active: false, channels: [] },
    });
  } catch (err) {
    console.error(`[pipeline] Failed for user ${userId}:`, err);
    sessionManager.setError(
      userId,
      err instanceof Error ? err.message : "Pipeline failed"
    );
    sendToClient(ws, {
      type: "PIPELINE_ERROR",
      error: err instanceof Error ? err.message : "Pipeline processing failed",
    });
  }
}

function sendToClient(ws: WebSocket, msg: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ── Server Setup ───────────────────────────────────────────────────────────

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    const { pathname } = parse(req.url || "/", true);

    if (pathname === "/ws/relay") {
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
          console.log("WebSocket: Authentication missing");
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        try {
          const payload = await verifyToken(sessionToken, {
            secretKey: process.env.CLERK_SECRET_KEY,
          });

          if (!payload) {
            console.log("WebSocket: Invalid session token");
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
          }
          
          const userId = typeof payload.sub === 'string' ? payload.sub : String(payload.sub);
          
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req, userId);
          });
        } catch (authError) {
          console.error("WebSocket auth error:", authError);
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
        }
      } catch (err) {
        console.error("Upgrade handler exception:", err);
        socket.destroy();
      }
    } 
    // Internal Next.js HMR and other upgrades are handled by the dev server automatically
    // as long as we don't explicitly destroy the socket here.
  });

  wss.on("connection", async (ws: WebSocket, req: any, userId: string) => {
    activeSessions.set(userId, ws);
    console.log(`[relay] WS connected for user ${userId}`);

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
      console.error("[relay] Failed to fetch credentials:", e);
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
        console.log(`[relay] PONG timeout for user ${userId}`);
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
          console.log(`[relay] OBS connected mapped for user ${userId}`);

        } else if (msg.type === "OBS_DISCONNECTED") {
          activeObsStatus.set(userId, { obsConnected: false, lastSeen: Date.now() });
          console.log(`[relay] OBS disconnected mapped for user ${userId} - reason: ${msg.reason}`);

          // Auto-stop session if OBS disconnects during streaming
          if (sessionManager.isActive(userId)) {
            // Stop RTMP streamer first
            const streamer = activeStreamers.get(userId);
            if (streamer) {
              streamer.stop();
              activeStreamers.delete(userId);
            }
            const session = sessionManager.stopSession(userId);
            sendToClient(ws, {
              type: "SESSION_STOPPED",
              reason: "OBS disconnected",
              ...sessionManager.getSnapshot(userId),
            });
            console.log(`[relay] Auto-stopped session for user ${userId} due to OBS disconnect`);
          }

        } else if (msg.type === "GO_LIVE") {
          // Start a new streaming session
          console.log(`[relay] GO_LIVE requested by user ${userId}`);
          handleGoLive(userId, ws);

        } else if (msg.type === "STOP_STREAM") {
          // Stop the streaming session
          console.log(`[relay] STOP_STREAM requested by user ${userId}`);
          // Stop RTMP streamer
          const streamer = activeStreamers.get(userId);
          if (streamer) {
            streamer.stop();
            activeStreamers.delete(userId);
          }
          const session = sessionManager.stopSession(userId);
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
          console.log(`[relay] OBS Event for ${userId}:`, msg.event);
        }
      } catch (e) {
        // Ignore invalid parses
      }
    });

    ws.on("close", () => {
      console.log(`[relay] WS closed for user ${userId}`);
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
        sessionManager.stopSession(userId);
      }
    });
    
    ws.on("error", (err: Error) => {
      console.error(`[relay] WS error for user ${userId}:`, err);
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

// ── Go Live Handler ────────────────────────────────────────────────────────

async function handleGoLive(userId: string, ws: WebSocket) {
  try {
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
        console.error(`[relay] RTMP error for user ${userId}:`, err.message);
        sendToClient(ws, {
          type: "RTMP_ERROR",
          error: err.message,
        });
      });

      streamer.on("stopped", () => {
        console.log(`[relay] RTMP stopped for user ${userId}`);
      });

      streamer.on("channel-error", (channelId: string, error: string) => {
        sendToClient(ws, {
          type: "RTMP_CHANNEL_ERROR",
          channelId,
          error,
        });
      });

      const started = streamer.start(rtmpConfigs);
      if (started) {
        activeStreamers.set(userId, streamer);
        console.log(`[relay] RTMP streamer started for user ${userId} with ${rtmpConfigs.length} destination(s)`);

        // Update stream stage
        sessionManager.updateStage(userId, "stream", "active", "Connecting...");
      } else {
        console.warn(`[relay] RTMP streamer failed to start for user ${userId}`);
        sessionManager.updateStage(userId, "stream", "error", "FFmpeg failed");
      }
    } else {
      console.log(`[relay] No RTMP destinations configured — pipeline-only mode`);
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

    console.log(`[relay] Session started for user ${userId} with languages: ${languages.join(", ")}`);
  } catch (err) {
    console.error(`[relay] GO_LIVE failed for user ${userId}:`, err);
    sendToClient(ws, {
      type: "GO_LIVE_ERROR",
      error: "Failed to start session. Please try again.",
    });
  }
}
