const fs = require("fs");
const p = require("path");
const root = p.join("C:", "Code", "vaani");

// Files that need console.* replaced (simple patterns only — no template literals with ${})
// For template literal ones, we'll handle them separately
const simpleReplacements = {
  "src/app/api/channels/route.ts": [
    ["console.error(`[channels] GET failed for user ${userId}:`, error);", "logger.error({ err: error, userId }, \"Channels GET failed\");"],
    ["console.log(`[channels] Upserted ${lang.id} for user ${userId}`);", "logger.info({ userId, languageId: lang.id }, \"Channel upserted\");"],
    ["console.error(`[channels] POST failed for user ${userId}:`, error);", "logger.error({ err: error, userId }, \"Channels POST failed\");"],
    ["console.log(`[channels] Deleted ${body.languageId} for user ${userId}`);", "logger.info({ userId, languageId: body.languageId }, \"Channel deleted\");"],
    ["console.error(`[channels] DELETE failed for user ${userId}:`, error);", "logger.error({ err: error, userId }, \"Channels DELETE failed\");"],
  ],
  "src/app/api/sessions/route.ts": [
    ["console.error(\"[SESSIONS_GET]\", error);", "logger.error({ err: error }, \"Sessions fetch failed\");"],
  ],
  "src/app/api/sessions/export/route.ts": [
    ["console.error(\"[SESSIONS_EXPORT]\", error);", "logger.error({ err: error }, \"Sessions export failed\");"],
  ],
  "src/app/api/health/route.ts": [
    ["console.error(\"[Health Check] Failed:\", error);", "logger.error({ err: error }, \"Health check failed\");"],
  ],
  "src/app/api/test-pipeline/route.ts": [
    ["console.error(\"[test-pipeline] Error:\", err);", "logger.error({ err }, \"Test pipeline failed\");"],
  ],
  "src/app/api/obs/credentials/route.ts": [
    ["console.error(`[obs/credentials] POST error for ${userId}:`, error);", "logger.error({ err: error, userId }, \"OBS credentials save failed\");"],
    ["console.error(`[obs/credentials] DELETE error for ${userId}:`, error);", "logger.error({ err: error, userId }, \"OBS credentials delete failed\");"],
  ],
  "src/app/api/obs/status/route.ts": [
    ["console.error(`[obs/status] Failed to fetch for user ${userId}:`, error);", "logger.error({ err: error, userId }, \"OBS status check failed\");"],
  ],
  "src/app/api/key/route.ts": [
    ["console.log(`[key/delete] Key removed for user ${userId}`);", "logger.info({ userId }, \"Key removed\");"],
    ["console.error(`[key/delete] Failed for user ${userId}:`, error);", "logger.error({ err: error, userId }, \"Key removal failed\");"],
  ],
  "src/app/api/key/status/route.ts": [
    ["console.error(`[key/status] Failed for user ${userId}:`, error);", "logger.error({ err: error, userId }, \"Key status check failed\");"],
  ],
  "src/app/actions/join-waitlist.ts": [
    ["console.error(\"Waitlist error:\", error);", "logger.error({ err: error }, \"Waitlist join failed\");"],
  ],
  "src/app/(dashboard)/settings/page.tsx": [
    ["console.error(\"[settings] Failed to fetch key status:\", err);", "logger.error({ err }, \"Key status fetch failed\");"],
  ],
  "src/app/(dashboard)/settings/OBSConnectionSection.tsx": [
    ["console.error(\"[settings] Failed to fetch OBS status:\", err);", "logger.error({ err }, \"OBS status fetch failed\");"],
  ],
  "src/app/(dashboard)/dashboard/page.tsx": [
    ["console.error(\"Dashboard fetch error:\", err);", "logger.error({ err }, \"Dashboard data fetch failed\");"],
  ],
  "src/app/components/OnboardingWizard.tsx": [
    ["console.error(e)", "logger.error({ err: e }, \"Onboarding step failed\");"],
  ],
  "src/app/components/WaitlistModal.tsx": [
    ["console.error(error)", "logger.error({ error }, \"Waitlist submit failed\");"],
  ],
};

let totalReplaced = 0;
let totalFiles = 0;

for (const [file, replacements] of Object.entries(simpleReplacements)) {
  const fp = p.join(root, file);
  if (!fs.existsSync(fp)) {
    console.log("SKIP (not found):", file);
    continue;
  }
  totalFiles++;
  let c = fs.readFileSync(fp, "utf8");

  // Add logger import if not present
  if (!c.includes("from \"@/lib/logger\"") && !c.includes("from \"../lib/logger\"") && !c.includes("from \"./logger\"")) {
    // Find the first import statement and add after it
    const importMatch = c.match(/^import .+;$/m);
    if (importMatch) {
      const idx = c.indexOf(importMatch[0]) + importMatch[0].length;
      c = c.slice(0, idx) + "\nimport { logger } from \"@/lib/logger\";" + c.slice(idx);
    }
  }

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
    console.log(`✓ ${file}: ${replaced}/${replacements.length}`);
    totalReplaced += replaced;
  } else {
    console.log(`- ${file}: no changes`);
  }
}

console.log(`\nTotal: ${totalReplaced} replacements across ${totalFiles} files`);
