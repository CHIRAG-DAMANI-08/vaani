import { describe, it, expect } from "vitest";
import { computePumpWrite, smoothDelay } from "./sync-schedule";

describe("computePumpWrite", () => {
  it("writes 4800 bytes for 100ms elapsed", () => {
    expect(computePumpWrite(100, 0)).toEqual({ bytesToWrite: 4800, bytesTarget: 0 });
  });

  it("drains the accumulated backlog when elapsed is zero", () => {
    expect(computePumpWrite(0, 1000)).toEqual({ bytesToWrite: 1000, bytesTarget: 0 });
  });

  it("returns a negative write for negative elapsed (caller guards the <= 0 case)", () => {
    expect(computePumpWrite(-50, 100)).toEqual({ bytesToWrite: -2300, bytesTarget: 0 });
  });

  it("carries the fractional remainder", () => {
    expect(computePumpWrite(100, 100)).toEqual({ bytesToWrite: 4900, bytesTarget: 0 });
  });

  it("caps at 9600 bytes per tick and carries the excess", () => {
    expect(computePumpWrite(500, 0)).toEqual({ bytesToWrite: 9600, bytesTarget: 14400 });
  });
});

describe("smoothDelay", () => {
  it("returns measured + 500ms headroom on the first call (current === 0)", () => {
    expect(smoothDelay(0, 3500)).toBe(4000);
  });

  it("blends 70% current / 30% target in steady state", () => {
    expect(smoothDelay(4000, 5000)).toBe(4450); // 0.7*4000 + 0.3*5500
  });

  it("clamps to the minimum delay", () => {
    expect(smoothDelay(0, 100)).toBe(2000); // 600 → clamped to 2000
  });

  it("clamps to the maximum delay", () => {
    expect(smoothDelay(8000, 8000)).toBe(8000); // 8500 → clamped to 8000
  });
});
