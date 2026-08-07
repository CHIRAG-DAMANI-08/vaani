import { describe, it, expect } from "vitest";
import { computePumpWrite } from "./sync-schedule";

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
