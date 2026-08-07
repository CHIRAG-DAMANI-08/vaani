import { describe, it, expect } from "vitest";
import { decideJoin, MAX_WAITLIST_ATTEMPTS } from "./waitlist-policy";

describe("decideJoin", () => {
  it("allows a fresh email (no prior entry)", () => {
    expect(decideJoin(null)).toEqual({ state: "success" });
  });

  it("rejects a re-entry with a sent email (never re-send)", () => {
    expect(decideJoin({ emailSent: true, attemptCount: 1 })).toEqual({
      state: "duplicate",
    });
  });

  it("allows retry when the first send failed and attempts remain", () => {
    expect(decideJoin({ emailSent: false, attemptCount: 1 })).toEqual({
      state: "success",
    });
  });

  it("blocks once the lifetime attempt cap is reached", () => {
    expect(decideJoin({ emailSent: false, attemptCount: MAX_WAITLIST_ATTEMPTS })).toEqual({
      state: "blocked",
    });
  });

  it("treats legacy entries (no sent flag) as already-joined", () => {
    expect(decideJoin({ emailSent: undefined, attemptCount: undefined })).toEqual({
      state: "duplicate",
    });
  });
});
