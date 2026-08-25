/**
 * One-time migration: encrypt existing plaintext Channel.rtmpKey values.
 *
 * Before: rtmpKey stored as plaintext String
 * After:  rtmpKeyEnc (encrypted), rtmpKeyLast4 (display), rtmpKeyUpdatedAt (timestamp)
 *
 * Idempotent — safe to run multiple times. Only processes channels where
 * rtmpKey is a non-empty string AND rtmpKeyEnc is not yet set.
 *
 * Usage: npx tsx src/scripts/migrate-rtmp-keys.ts
 */

import { connectToDatabase } from "../lib/mongodb";
import { encryptValue } from "../lib/encryption";

async function migrate() {
  await connectToDatabase();
  const { Channel } = await import("../lib/models/channel");
  const mongoose = (await import("mongoose")).default;

  // Find channels with plaintext rtmpKey but no encrypted version yet
  const channels = await Channel.find({
    rtmpKey: { $type: "string", $ne: "" },
    $or: [{ rtmpKeyEnc: null }, { rtmpKeyEnc: { $exists: false } }],
  }).lean();

  console.log(`[migrate] Found ${channels.length} channels with plaintext RTMP keys to encrypt.`);

  let updated = 0;
  for (const ch of channels) {
    try {
      const plaintext = (ch as unknown as { rtmpKey: string }).rtmpKey;
      if (!plaintext) continue;
      const enc = encryptValue(plaintext);
      await Channel.updateOne(
        { _id: (ch as unknown as { _id: { toString(): string } })._id },
        {
          $set: {
            rtmpKeyEnc: enc,
            rtmpKeyLast4: plaintext.slice(-4),
            rtmpKeyUpdatedAt: new Date(),
          },
          $unset: { rtmpKey: "" },
        }
      );
      updated++;
    } catch (err) {
      console.error(`[migrate] Failed to encrypt channel ${(ch as unknown as { _id: { toString(): string } })._id}:`, err);
    }
  }

  console.log(`[migrate] Encrypted ${updated} RTMP keys.`);

  // Verify: count remaining plaintext keys
  const remaining = await Channel.countDocuments({
    rtmpKey: { $type: "string", $ne: "" },
  });
  console.log(`[migrate] Remaining plaintext keys: ${remaining}`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("[migrate] Fatal error:", err);
  process.exit(1);
});
