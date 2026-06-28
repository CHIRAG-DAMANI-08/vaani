const fs = require("fs");
const p = require("path");
const root = p.join("C:", "Code", "vaani");

// Map of file paths (relative to root) to arrays of [before, after] replacements
const fileReplacements = {
  // ── src/lib/rtmp-streamer.ts ──
  "src/lib/rtmp-streamer.ts": [
    ['console.warn("[rtmp] Streamer already active");', 'logger.warn("Streamer already active");'],
    ['console.warn("[rtmp] No RTMP channels configured \u2014 skipping");', 'logger.warn("No RTMP channels configured");'],
    ['console.log(`[rtmp] Spawning FFmpeg with ${this.channels.length} destination(s)`);', 'logger.info({ destinations: this.channels.length }, "FFmpeg spawning");'],
    ['console.warn(`[rtmp] FFmpeg stdin backpressure detected (audio queue size: ${this.audioQueue.length})`);', 'logger.warn({ queueSize: this.audioQueue.length }, "FFmpeg stdin backpressure");'],
    ['console.log(`[rtmp/stdout] ${data}`);', 'logger.debug({ data: data.toString() }, "FFmpeg stdout");'],
    ['console.warn(`[rtmp] Stereo filter failed (mono input detected). Restarting with mono fallback...`);', 'logger.warn("Stereo filter failed, switching to mono fallback");'],
    ['console.log(`[rtmp/ffmpeg] ${msg}`);', 'logger.debug({ msg }, "FFmpeg stderr");'],
    ['console.log(`[rtmp] FFmpeg exited with code ${code}`);', 'logger.info({ code }, "FFmpeg exited");'],
    ['console.error(`[rtmp] FFmpeg process error:`, err);', 'logger.error({ err }, "FFmpeg process error");'],
    ['console.error(`[rtmp] Failed to spawn FFmpeg:`, err);', 'logger.error({ err }, "FFmpeg spawn failed");'],
    ['console.error(`[rtmp] Error pushing audio:`, err);', 'logger.error({ err }, "Push audio failed");'],
    ['console.log(`[rtmp] Stopping FFmpeg (${this.totalBytesPushed} bytes pushed total)`);', 'logger.info({ bytesPushed: this.totalBytesPushed }, "FFmpeg stopping");'],
    ['console.error(`[rtmp] Error stopping FFmpeg:`, err);', 'logger.error({ err }, "FFmpeg stop failed");'],
    ['console.error(`[rtmp] Max restart attempts (${this.maxRestartAttempts}) exceeded`);', 'logger.error({ maxAttempts: this.maxRestartAttempts }, "FFmpeg max restart attempts exceeded");'],
    ['console.log(`[rtmp] Restarting FFmpeg (attempt ${this.restartAttempts}/${this.maxRestartAttempts}) in ${delay}ms`);', 'logger.info({ attempt: this.restartAttempts, maxAttempts: this.maxRestartAttempts, delay }, "FFmpeg restarting");'],
    ['console.warn(`[rtmp] Could not attribute error to specific channel: ${errorMsg}`);', 'logger.warn({ error: errorMsg }, "Unattributed FFmpeg error");'],
  ],

  // ── src/lib/sarvam-pipeline.ts ──
  "src/lib/sarvam-pipeline.ts": [
    ['console.error("[pipeline] Error:", error);', 'logger.error({ err: error }, "Pipeline stage failed");'],
  ],

  // ── src/lib/sarvam.ts ──
  "src/lib/sarvam.ts": [
    ['console.error("[sarvam] Validation call timed out after 5s");', 'logger.warn("Sarvam validation timeout");'],
    ['console.error("[sarvam] Validation call failed:", error);', 'logger.error({ err: error }, "Sarvam validation failed");'],
  ],

  // ── src/lib/use-csrf.ts ──
  "src/lib/use-csrf.ts": [
    ['console.error("[csrf] Failed to fetch token:", err);', 'logger.warn({ err }, "CSRF token fetch failed");'],
  ],

  // ── src/app/layout.tsx ──
  "src/app/layout.tsx": [
    ['console.log("RootLayout: Clerk Key:", process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);', '// removed: was logging credential in production'],
  ],
};

let totalReplaced = 0;
let totalFiles = 0;

for (const [file, replacements] of Object.entries(fileReplacements)) {
  const fp = p.join(root, file);
  if (!fs.existsSync(fp)) {
    console.log("SKIP (not found):", file);
    continue;
  }
  totalFiles++;
  let c = fs.readFileSync(fp, "utf8");
  let replaced = 0;

  for (const [before, after] of replacements) {
    if (c.includes(before)) {
      c = c.replace(before, after);
      replaced++;
    } else {
      console.log(`  NOT FOUND in ${file}: ${before.slice(0, 50)}...`);
    }
  }

  if (replaced > 0) {
    fs.writeFileSync(fp, c);
    console.log(`✓ ${file}: ${replaced}/${replacements.length} replaced`);
    totalReplaced += replaced;
  } else {
    console.log(`- ${file}: no changes needed`);
  }
}

console.log(`\nTotal: ${totalReplaced} replacements across ${totalFiles} files`);
