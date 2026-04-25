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
import { EventEmitter } from "events";

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
  private _active = false;
  private totalBytesPushed = 0;
  private restartAttempts = 0;
  private maxRestartAttempts = 3;

  /**
   * Start the FFmpeg relay for the given channels.
   * Spawns a single FFmpeg process with a tee muxer that outputs
   * to all RTMP destinations simultaneously.
   */
  start(channels: ChannelRTMPConfig[]): boolean {
    if (this._active) {
      console.warn("[rtmp] Streamer already active");
      return false;
    }

    if (channels.length === 0) {
      console.warn("[rtmp] No RTMP channels configured — skipping");
      return false;
    }

    this.channels = channels;
    this.totalBytesPushed = 0;
    this.restartAttempts = 0;

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
          return `[f=flv:onfail=ignore]${fullUrl}`;
        })
        .join("|");

      const ffmpegArgs = [
        // Input: raw PCM from stdin
        "-f", "s16le",         // signed 16-bit little-endian
        "-ar", "24000",        // 24kHz sample rate (Sarvam TTS default)
        "-ac", "1",            // mono
        "-probesize", "32",    // Minimal input analysis (low-latency)
        "-analyzeduration", "0", // Skip format analysis
        "-i", "pipe:0",        // read from stdin

        // Low-latency flags
        "-fflags", "nobuffer",
        "-flags", "low_delay",

        // Output: AAC encoding
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",        // Standard RTMP sample rate
        "-ac", "2",            // Stereo output (required by many RTMP servers)

        // Tee muxer for multi-destination
        "-f", "tee",
        teeOutputs,
      ];

      console.log(`[rtmp] Spawning FFmpeg with ${this.channels.length} destination(s)`);

      this.ffmpegProcess = spawn("ffmpeg", ffmpegArgs, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this._active = true;

      // ── Handle FFmpeg stdout (usually empty for audio) ──
      this.ffmpegProcess.stdout?.on("data", (data: Buffer) => {
        // Usually nothing here, but log if something comes
        console.log(`[rtmp/stdout] ${data.toString().trim()}`);
      });

      // ── Handle FFmpeg stderr (progress/errors) ──
      this.ffmpegProcess.stderr?.on("data", (data: Buffer) => {
        const msg = data.toString().trim();

        // Detect connection-related errors
        if (msg.includes("Connection refused") || msg.includes("Connection timed out")) {
          this.handleChannelError(msg);
        } else if (msg.includes("Output stream")) {
          // Stream opened successfully
          this.updateAllChannelStatuses("live");
        }

        // Log only non-spammy FFmpeg output
        if (!msg.startsWith("size=") && !msg.startsWith("frame=")) {
          console.log(`[rtmp/ffmpeg] ${msg}`);
        }
      });

      // ── Handle FFmpeg exit ──
      this.ffmpegProcess.on("close", (code) => {
        console.log(`[rtmp] FFmpeg exited with code ${code}`);
        this._active = false;
        this.ffmpegProcess = null;

        if (code !== 0 && code !== null) {
          // Attempt restart on unexpected exit
          this.attemptRestart();
        } else {
          this.updateAllChannelStatuses("stopped");
          this.emit("stopped");
        }
      });

      this.ffmpegProcess.on("error", (err) => {
        console.error("[rtmp] FFmpeg process error:", err);
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
      console.error("[rtmp] Failed to spawn FFmpeg:", err);
      this._active = false;
      return false;
    }
  }

  /**
   * Push a TTS audio chunk (base64-encoded WAV) into the FFmpeg pipeline.
   * Strips the WAV header and writes raw PCM to FFmpeg's stdin.
   */
  pushAudio(audioBase64: string): boolean {
    if (!this._active || !this.ffmpegProcess?.stdin?.writable) {
      return false;
    }

    try {
      const wavBuffer = Buffer.from(audioBase64, "base64");
      const pcmBuffer = stripWavHeader(wavBuffer);

      if (pcmBuffer.length === 0) {
        return false;
      }

      const written = this.ffmpegProcess.stdin.write(pcmBuffer);
      this.totalBytesPushed += pcmBuffer.length;

      if (!written) {
        // Backpressure — FFmpeg can't keep up. This chunk may be dropped.
        console.warn("[rtmp] FFmpeg stdin backpressure detected");
      }

      return true;
    } catch (err) {
      console.error("[rtmp] Error pushing audio:", err);
      return false;
    }
  }

  /**
   * Gracefully stop the FFmpeg process.
   * Closes stdin first to signal end-of-input, then terminates.
   */
  stop(): void {
    if (!this.ffmpegProcess) return;

    console.log(`[rtmp] Stopping FFmpeg (${this.totalBytesPushed} bytes pushed total)`);
    this._active = false;

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
      console.error("[rtmp] Error stopping FFmpeg:", err);
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
    if (this.restartAttempts >= this.maxRestartAttempts) {
      console.error(`[rtmp] Max restart attempts (${this.maxRestartAttempts}) exceeded`);
      this.updateAllChannelStatuses("error", "FFmpeg crashed — max retries exceeded");
      this.emit("error", new Error("FFmpeg max restart attempts exceeded"));
      return;
    }

    this.restartAttempts++;
    const delay = 1000 * this.restartAttempts; // 1s, 2s, 3s
    console.log(`[rtmp] Restarting FFmpeg (attempt ${this.restartAttempts}/${this.maxRestartAttempts}) in ${delay}ms`);

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
    console.warn("[rtmp] Could not attribute error to specific channel:", errorMsg);
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
