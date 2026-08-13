// src/lib/device-fingerprint.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashDeviceId, checkDeviceCardinality, checkIpCardinality } from "./device-fingerprint";

vi.mock("@/lib/mongodb", () => ({ connectToDatabase: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/models/beta-application", () => ({
  BetaApplication: {
    countDocuments: vi.fn(),
  },
}));

import { BetaApplication } from "@/lib/models/beta-application";

describe("device-fingerprint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hashDeviceId produces deterministic SHA-256 hex", () => {
    const h1 = hashDeviceId("visitor-123");
    const h2 = hashDeviceId("visitor-123");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
    expect(h1).toMatch(/^[a-f0-9]+$/);
  });

  it("hashDeviceId differs for different inputs", () => {
    expect(hashDeviceId("a")).not.toBe(hashDeviceId("b"));
  });

  it("checkDeviceCardinality returns count and flag", async () => {
    (BetaApplication.countDocuments as any).mockResolvedValue(2);
    const r = await checkDeviceCardinality("hash-abc");
    expect(r).toEqual({ flagged: false, count: 2 });
  });

  it("checkDeviceCardinality flags at >= 3", async () => {
    (BetaApplication.countDocuments as any).mockResolvedValue(3);
    const r = await checkDeviceCardinality("hash-abc");
    expect(r).toEqual({ flagged: true, count: 3 });
  });

  it("checkIpCardinality mirrors device logic", async () => {
    (BetaApplication.countDocuments as any).mockResolvedValue(5);
    const r = await checkIpCardinality("1.2.3.4");
    expect(r).toEqual({ flagged: true, count: 5 });
  });
});