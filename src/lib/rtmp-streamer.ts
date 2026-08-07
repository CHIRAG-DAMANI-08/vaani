/**
 * RTMP Streamer — FFmpeg-based audio relay to RTMP endpoints.
 *
 * Takes base64-encoded WAV audio from the Sarvam TTS pipeline,
 * strips WAV headers to get raw PCM, and pipes it into an FFmpeg
 * process that encodes to AAC and pushes to one or more RTMP
 * destinations using the `tee` muxer.
 *
 * Architecture:
 *   TTS audio (base64 WAV) → stripWavHeader → raw PCM →
 *   FFmpeg stdin → AAC encode → tee muxer → RTMP endpoints
 */

import { spawn, ChildProcess } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { EventEmitter } from "events";
import { logger } from "./logger";
import { drainDue, DROP_TOLERANCE_MS } from "./sync-schedule";

// ── Types ──────────────────────────────────────────────────────────────────

export type ChannelRTMPConfig = {
  channelId: string;
  languageId: string;
  languageName: string;
  rtmpUrl: string;
  rtmpKey: string;
};

export type RTMPChannelStatus = "connecting" | "live" | "error" | "stopped";

export type RTMPStreamStatus = {
  channelId: string;
  languageId: string;
  status: RTMPChannelStatus;
  error?: string;
};

export type RTMPStreamerSnapshot = {
  active: boolean;
  channels: RTMPStreamStatus[];
};

// ── WAV header stripping ───────────────────────────────────────────────────

/**
 * Strip the WAV RIFF header from a buffer to produce raw PCM data.
 * Standard WAV header is 44 bytes, but we scan for the 'data' chunk
 * to handle extended headers correctly.
 */
function stripWavHeader(wavBuffer: Buffer): Buffer {
  // Minimum WAV file has 44-byte header
  if (wavBuffer.length < 44) return wavBuffer;

  // Check for RIFF header
  const riff = wavBuffer.toString("ascii", 0, 4);
  if (riff !== "RIFF") {
    // Not a WAV file — return as-is (might already be raw PCM)
    return wavBuffer;
  }

  // Scan for 'data' subchunk
  let offset = 12; // Skip RIFF header + format
  while (offset < wavBuffer.length - 8) {
    const chunkId = wavBuffer.toString("ascii", offset, offset + 4);
    const chunkSize = wavBuffer.readUInt32LE(offset + 4);

    if (chunkId === "data") {
      // Data starts after the 8-byte chunk header
      return wavBuffer.subarray(offset + 8);
    }

    offset += 8 + chunkSize;
  }

  // Fallback: skip standard 44-byte header
  return wavBuffer.subarray(44);
}

// ── RTMP Streamer ──────────────────────────────────────────────────────────

export class RTMPStreamer extends EventEmitter {
  private ffmpegProcess: ChildProcess | null = null;
  private channels: ChannelRTMPConfig[] = [];
  private channelStatuses: Map<string, RTMPStreamStatus> = new Map();
  private ingestUrl: string = "";
  private _active = false;
  private _monoFallback = false;
  private totalBytesPushed = 0;
  private restartAttempts = 0;
  private maxRestartAttempts = 3;
  private audioInterval: NodeJS.Timeout | null = null;
  private audioQueue: Buffer[] = [];
  // Chunks waiting for their scheduled playback time (captureTime + targetDelay).
  // Stays sorted by targetTime because the serial pipeline pushes in capture order.
  private pendingAudio: Array<{ pcm: Buffer; targetTime: number }> = [];
  // Sample-exact pump state: cumulative target bytes (48 B/ms = 24kHz * 16-bit mono)
  // and the wall-clock of the last tick. Keeps the audio PTS rate locked to the
  // video clock so A/V doesn't drift apart on long streams.
  private audioBytesTarget = 0;
  private lastPumpTime = 0;
  // Playback delay applied to every chunk (captureTime + targetDelay), auto-tuned
  // by setTargetDelay() to ~pipeline latency + headroom. 0 until first measurement.
  private targetDelayMs = 0;
  // Set by stop() so the close handler and attemptRestart() never respawn
  // FFmpeg after the user explicitly stopped the streamer.
  private _stopped = false;
  // Bound on queued audio so TTS bursts cannot grow memory without limit.
  // ~60s of 24kHz 16-bit mono = ~2.8 MB; 200 chunks is a safe ceiling.
  private maxAudioQueueChunks = 200;

  /**
   * Start the FFmpeg relay for the given channels.
   * Spawns a single FFmpeg process with a tee muxer that outputs
   * to all RTMP destinations simultaneously.
   */
  start(channels: ChannelRTMPConfig[], ingestUrl: string): boolean {
    if (this._active) {
      logger.warn("Streamer already active");
      return false;
    }

    if (channels.length === 0) {
      logger.warn("No RTMP channels configured");
      return false;
    }

    this.channels = channels;
    this.ingestUrl = ingestUrl;
    this.totalBytesPushed = 0;
    this.restartAttempts = 0;
    this.audioQueue = [];
    this.pendingAudio = [];
    this.audioBytesTarget = 0;
    this.lastPumpTime = 0;

    // Initialize channel statuses
    for (const ch of channels) {
      this.channelStatuses.set(ch.channelId, {
        channelId: ch.channelId,
        languageId: ch.languageId,
        status: "connecting",
      });
    }

    return this.spawnFFmpeg();
  }

  /**
   * Spawn the FFmpeg process with the tee muxer configuration.
   *
   * Input: raw PCM via stdin (s16le, 24kHz, mono — matching Sarvam TTS output)
   * Output: AAC-encoded FLV streams to each RTMP URL
   */
  private spawnFFmpeg(): boolean {
    try {
      // Build the tee output string
      // Each destination: [f=flv:onfail=ignore]rtmp://url/key
      const teeOutputs = this.channels
        .map((ch) => {
          const fullUrl = ch.rtmpUrl.endsWith("/")
            ? `${ch.rtmpUrl}${ch.rtmpKey}`
            : `${ch.rtmpUrl}/${ch.rtmpKey}`;
          // Escape characters that break FFmpeg filter syntax
          const safeUrl = fullUrl.replace(/[\\';]/g, "\\$&");
          return `[f=flv:onfail=ignore]${safeUrl}`;
        })
        .join("|");

      // Audio mixing strategy:
      // - Stereo input (L/R panned in OBS): Use channelsplit + sidechain ducking
      // - Mono fallback: Simply replace original audio with TTS (no ducking possible)
      //
      // We attempt the stereo filter_complex first. If FFmpeg fails with a channel
      // layout error, the restart handler will retry with the simple fallback.
      const stereoFilter = "[0:a]channelsplit=channel_layout=stereo[desktop][mic];[desktop][1:a]sidechaincompress=threshold=0.04:ratio=4:attack=50:release=1000[ducked_desktop];[ducked_desktop][1:a]amix=inputs=2:duration=first:dropout_transition=2[final_audio]";
      const monoFallback = "[1:a]aresample=44100[final_audio]";

      const useFilter = this._monoFallback ? monoFallback : stereoFilter;
      const mapAudio = "[final_audio]";

      const ffmpegArgs = [
        "-hide_banner", "-loglevel", "error",

        // NOTE: probesize/analyzeduration left at defaults. The previous
        // "-probesize 32 -analyzeduration 0" let FFmpeg start muxing before the
        // H.264 decoder config (AVCDecoderConfigurationRecord) arrived from the
        // ingest, producing an invalid/empty video track in the FLV — YouTube and
        // Twitch kept the audio and silently dropped the video.
        "-fflags", "nobuffer",

        // Input 0: Original stream from OBS via local RTMP ingest
        "-i", this.ingestUrl,

        // Input 1: TTS audio from pipeline via stdin
        "-f", "s16le",         // signed 16-bit little-endian
        "-ar", "24000",        // 24kHz sample rate (Sarvam TTS default)
        "-ac", "1",            // mono
        "-i", "pipe:0",        // read from stdin

        // Low-latency encode flags
        "-flags", "low_delay",

        // Audio filter (stereo ducking or mono fallback)
        "-filter_complex", useFilter,

        // Mapping: Video from Input 0, Audio from filter
        "-map", "0:v:0",
        "-map", mapAudio,

        // Video: Copy (no re-encode)
        "-c:v", "copy",

        // Audio: Encode TTS to AAC
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",        // Standard RTMP sample rate
        "-ac", "2",            // Stereo output (required by many RTMP servers)

        // Tee muxer for multi-destination
        "-f", "tee",
        teeOutputs,
      ];

      logger.info({ destinations: this.channels.length }, "FFmpeg spawning");
      // @ts-ignore
      const ffmpegExec = ffmpegPath || "ffmpeg";
      this.ffmpegProcess = spawn(ffmpegExec, ffmpegArgs, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this._active = true;

      // ── Audio Pump ──
      // FFmpeg requires continuous audio input to mux with the video stream.
      // If we don't supply data to stdin continuously, video muxing stalls and buffers overflow.
      // The pump is sample-exact: each tick it writes however many bytes the elapsed
      // wall-clock implies (24kHz * 16-bit mono = 48 B/ms). Writing a fixed 4800 bytes
      // per tick regardless of actual elapsed time made the audio clock drift from the
      // video clock under event-loop load (one Node process serves every user).
      this.audioInterval = setInterval(() => {
        if (!this._active || !this.ffmpegProcess?.stdin?.writable) return;

        const now = Date.now();
        if (this.lastPumpTime === 0) this.lastPumpTime = now;
        const elapsedMs = now - this.lastPumpTime;
        this.lastPumpTime = now;

        // Release TTS chunks whose scheduled playback time has arrived.
        this.releasePending(now);

        this.audioBytesTarget += elapsedMs * 48; // 48 B/ms = 24kHz * 16-bit mono
        const bytesToWrite = Math.min(Math.floor(this.audioBytesTarget), 9600); // cap 200ms/tick
        if (bytesToWrite <= 0) return;
        this.audioBytesTarget -= bytesToWrite;

        const outputBuffer = Buffer.alloc(bytesToWrite, 0); // Fill with zeroes (silence) by default
        let offset = 0;

        while (offset < bytesToWrite && this.audioQueue.length > 0) {
          const chunk = this.audioQueue[0];
          const remainingSpace = bytesToWrite - offset;

          if (chunk.length <= remainingSpace) {
            chunk.copy(outputBuffer, offset);
            offset += chunk.length;
            this.audioQueue.shift();
          } else {
            chunk.subarray(0, remainingSpace).copy(outputBuffer, offset);
            this.audioQueue[0] = chunk.subarray(remainingSpace);
            offset += remainingSpace;
          }
        }

        const written = this.ffmpegProcess.stdin.write(outputBuffer);
        this.totalBytesPushed += bytesToWrite;

        if (!written && this.audioQueue.length > 0) {
           logger.warn({ queueSize: this.audioQueue.length }, "FFmpeg stdin backpressure");
        }
      }, 100);

      // ── Handle FFmpeg stdout (usually empty for audio) ──
      this.ffmpegProcess.stdout?.on("data", (data: Buffer) => {
        // Usually nothing here, but log if something comes
        logger.debug({ data: data.toString().trim() }, "FFmpeg stdout");
      });

      // ── Handle FFmpeg stderr (progress/errors) ──
      this.ffmpegProcess.stderr?.on("data", (data: Buffer) => {
        const msg = data.toString().trim();

        // Detect mono input → channelsplit failure → auto-fallback
        if (!this._monoFallback && (msg.includes("Channel layout change") || msg.includes("does not match specified channel layout") || msg.includes("channelsplit"))) {
          logger.warn("Stereo filter failed, switching to mono fallback");
          this._monoFallback = true;
          this.restartAttempts = 0; // Reset so the fallback restart isn't counted
          // We must ensure it restarts regardless of exit code.
          (this as any)._fallbackRestarting = true;
          // Kill current process — the close handler will restart with monoFallback=true
          this.ffmpegProcess?.kill("SIGTERM");
          return;
        }

        // Detect connection-related errors
        if (msg.includes("Connection refused") || msg.includes("Connection timed out")) {
          this.handleChannelError(msg);
        } else if (msg.includes("Output stream")) {
          // Stream opened successfully
          this.updateAllChannelStatuses("live");
        }

        // Log only non-spammy FFmpeg output
        if (!msg.startsWith("size=") && !msg.startsWith("frame=")) {
          logger.debug({ msg }, "FFmpeg stderr");
        }
      });

      // ── Handle FFmpeg exit ──
      this.ffmpegProcess.on("close", (code) => {
        logger.info({ code }, "FFmpeg exited");
        this._active = false;
        this.ffmpegProcess = null;
        if (this.audioInterval) clearInterval(this.audioInterval);

        if (this._stopped) {
          // Explicitly stopped — do not restart under any circumstance.
          this.updateAllChannelStatuses("stopped");
          this.emit("stopped");
        } else if (code !== 0 && code !== null) {
          // Attempt restart on unexpected exit
          this.attemptRestart();
        } else if ((this as any)._fallbackRestarting) {
          // Restart immediately because we killed it for fallback
          (this as any)._fallbackRestarting = false;
          this.spawnFFmpeg();
        } else {
          this.updateAllChannelStatuses("stopped");
          this.emit("stopped");
        }
      });

      this.ffmpegProcess.on("error", (err) => {
        logger.error({ err }, "FFmpeg process error");
        this._active = false;
        this.updateAllChannelStatuses("error", err.message);
        this.emit("error", err);
      });

      // Mark as "connecting" initially — will upgrade to "live" on first successful frame
      // Use a small delay to transition to "live" if no errors
      setTimeout(() => {
        if (this._active) {
          this.updateAllChannelStatuses("live");
        }
      }, 2000);

      return true;
    } catch (err) {
      logger.error({ err }, "FFmpeg spawn failed");
      this._active = false;
      return false;
    }
  }

  /**
   * Push a TTS audio chunk (base64-encoded WAV) into the FFmpeg pipeline.
   * Strips the WAV header and schedules the raw PCM to play at
   * captureTime + targetDelay so the translated voice trails the picture by a
   * constant offset instead of landing whenever the pipeline happens to finish.
   */
  pushAudio(audioBase64: string, captureTime?: number): boolean {
    if (!this._active || !this.ffmpegProcess?.stdin?.writable) {
      return false;
    }

    try {
      const wavBuffer = Buffer.from(audioBase64, "base64");
      const pcmBuffer = stripWavHeader(wavBuffer);

      if (pcmBuffer.length > 0) {
        const targetTime = (captureTime || Date.now()) + this.targetDelayMs;
        this.pendingAudio.push({ pcm: pcmBuffer, targetTime });
        // Release immediately if this chunk's scheduled time has already arrived.
        this.releasePending(Date.now());
      }

      return true;
    } catch (err) {
      logger.error({ err }, "Push audio failed");
      return false;
    }
  }

  /**
   * Auto-tune the playback delay from measured pipeline latency (ms). Smoothed so
   * one slow chunk doesn't yank the offset around. Stays in [2s, 8s].
   */
  setTargetDelay(totalMs: number): void {
    const target = Math.max(2000, Math.min(8000, Math.round(totalMs) + 500));
    this.targetDelayMs =
      this.targetDelayMs === 0
        ? target
        : Math.round(this.targetDelayMs * 0.7 + target * 0.3);
  }

  /**
   * Move chunks whose scheduled playback time has arrived into the drain queue.
   * Chunks that missed their window by > 1.5s are dropped — playing them late is
   * exactly what makes the voice lag jitter. pendingAudio stays sorted because
   * the serial pipeline pushes chunks in capture order.
   */
  private releasePending(now: number): void {
    const { due } = drainDue(this.pendingAudio, now, DROP_TOLERANCE_MS);
    for (const item of due) {
      // Backpressure: if the queue is full, drop the oldest chunk rather
      // than growing memory without bound under TTS burst conditions.
      if (this.audioQueue.length >= this.maxAudioQueueChunks) {
        this.audioQueue.shift();
      }
      this.audioQueue.push(item.pcm);
    }
  }

  /**
   * Gracefully stop the FFmpeg process.
   * Closes stdin first to signal end-of-input, then terminates.
   */
  stop(): void {
    if (!this.ffmpegProcess) return;

    logger.info({ bytesPushed: this.totalBytesPushed }, "FFmpeg stopping");
    this._active = false;
    this._stopped = true; // prevent close handler / attemptRestart from respawning
    if (this.audioInterval) clearInterval(this.audioInterval);
    this.audioQueue = []; // free queued audio immediately
    this.pendingAudio = [];

    try {
      // Close stdin to signal end-of-input
      if (this.ffmpegProcess.stdin?.writable) {
        this.ffmpegProcess.stdin.end();
      }

      // Give FFmpeg a moment to flush, then force kill
      setTimeout(() => {
        if (this.ffmpegProcess) {
          this.ffmpegProcess.kill("SIGTERM");
          // Force kill if still alive after 3s
          setTimeout(() => {
            if (this.ffmpegProcess) {
              this.ffmpegProcess.kill("SIGKILL");
              this.ffmpegProcess = null;
            }
          }, 3000);
        }
      }, 1000);
    } catch (err) {
      logger.error({ err }, "FFmpeg stop failed");
      this.ffmpegProcess?.kill("SIGKILL");
      this.ffmpegProcess = null;
    }

    this.updateAllChannelStatuses("stopped");
    this.emit("stopped");
  }

  /**
   * Attempt to restart FFmpeg after an unexpected exit.
   * Exponential backoff with a maximum of 3 attempts.
   */
  private attemptRestart(): void {
    if (this._stopped) return;
    if (this.restartAttempts >= this.maxRestartAttempts) {
      logger.error({ maxAttempts: this.maxRestartAttempts }, "FFmpeg max restart attempts exceeded");
      this.updateAllChannelStatuses("error", "FFmpeg crashed — max retries exceeded");
      this.emit("error", new Error("FFmpeg max restart attempts exceeded"));
      return;
    }

    this.restartAttempts++;
    const delay = 1000 * this.restartAttempts; // 1s, 2s, 3s
    logger.info({ attempt: this.restartAttempts, maxAttempts: this.maxRestartAttempts, delay }, "FFmpeg restarting");

    this.updateAllChannelStatuses("connecting");

    setTimeout(() => {
      if (!this._active) {
        this.spawnFFmpeg();
      }
    }, delay);
  }

  /**
   * Handle channel-specific errors from FFmpeg stderr.
   */
  private handleChannelError(errorMsg: string): void {
    // Try to match which channel failed from the RTMP URL in the error
    for (const ch of this.channels) {
      if (errorMsg.includes(ch.rtmpUrl) || errorMsg.includes(ch.rtmpKey)) {
        this.channelStatuses.set(ch.channelId, {
          channelId: ch.channelId,
          languageId: ch.languageId,
          status: "error",
          error: "Connection failed",
        });
        this.emit("channel-error", ch.channelId, errorMsg);
        return;
      }
    }

    // Generic error — mark all channels
    logger.warn({ error: errorMsg }, "Unattributed FFmpeg error");
  }

  /**
   * Update all channel statuses to the same value.
   */
  private updateAllChannelStatuses(status: RTMPChannelStatus, error?: string): void {
    for (const ch of this.channels) {
      this.channelStatuses.set(ch.channelId, {
        channelId: ch.channelId,
        languageId: ch.languageId,
        status,
        error,
      });
    }
  }

  // ── Public getters ─────────────────────────────────────────────────────

  get active(): boolean {
    return this._active;
  }

  get bytesPushed(): number {
    return this.totalBytesPushed;
  }

  /**
   * Get a serializable snapshot of the RTMP streamer state
   * for sending to the frontend via WebSocket.
   */
  getSnapshot(): RTMPStreamerSnapshot {
    return {
      active: this._active,
      channels: Array.from(this.channelStatuses.values()),
    };
  }
}
