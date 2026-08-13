// src/lib/device-fingerprint.ts
import { createHash } from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";

export function hashDeviceId(visitorId: string): string {
  // ponytail: SHA-256 is one-way; raw fingerprint never stored
  return createHash("sha256").update(visitorId).digest("hex");
}

export async function checkDeviceCardinality(deviceHash: string): Promise<{ flagged: boolean; count: number }> {
  await connectToDatabase();
  const count = await BetaApplication.countDocuments({ deviceHash });
  return { flagged: count >= 3, count };
}

export async function checkIpCardinality(ip: string): Promise<{ flagged: boolean; count: number }> {
  await connectToDatabase();
  const count = await BetaApplication.countDocuments({ ipAddress: ip });
  return { flagged: count >= 3, count };
}