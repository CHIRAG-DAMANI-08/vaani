import { describe, it, expect } from "vitest";
import { resolveLanguageId, groupTTSPayloadsByLanguage, mergeSnapshots } from "./channel-routing";

describe("resolveLanguageId", () => {
  it("maps a BCP-47 tag to its short id", () => {
    expect(resolveLanguageId("ta-IN")).toBe("ta");
    expect(resolveLanguageId("hi-IN")).toBe("hi");
  });

  it("returns null for a tag outside the registry", () => {
    expect(resolveLanguageId("xx-XX")).toBeNull();
    expect(resolveLanguageId("en-IN")).toBeNull();
  });
});

describe("groupTTSPayloadsByLanguage", () => {
  it("groups outputs by resolved language id, preserving order", () => {
    const grouped = groupTTSPayloadsByLanguage([
      { audioBase64: "A", targetLanguage: "ta-IN" },
      { audioBase64: "B", targetLanguage: "hi-IN" },
      { audioBase64: "C", targetLanguage: "ta-IN" },
    ]);
    expect(grouped.get("ta")?.map((o) => o.audioBase64)).toEqual(["A", "C"]);
    expect(grouped.get("hi")?.map((o) => o.audioBase64)).toEqual(["B"]);
  });

  it("drops outputs with an unknown target language", () => {
    const grouped = groupTTSPayloadsByLanguage([
      { audioBase64: "A", targetLanguage: "ta-IN" },
      { audioBase64: "B", targetLanguage: "xx-XX" },
    ]);
    expect(grouped.get("ta")?.map((o) => o.audioBase64)).toEqual(["A"]);
    expect(grouped.size).toBe(1);
  });

  it("drops outputs with empty audio", () => {
    expect(groupTTSPayloadsByLanguage([{ audioBase64: "", targetLanguage: "ta-IN" }]).size).toBe(0);
  });

  it("returns an empty map for no outputs", () => {
    expect(groupTTSPayloadsByLanguage([]).size).toBe(0);
  });
});

describe("mergeSnapshots", () => {
  it("concatenates channel statuses from all snapshots", () => {
    const merged = mergeSnapshots([
      { active: true, channels: [{ channelId: "c1", languageId: "hi", status: "live" }] },
      { active: true, channels: [{ channelId: "c2", languageId: "ta", status: "connecting" }] },
    ]);
    expect(merged.channels.map((c) => c.channelId)).toEqual(["c1", "c2"]);
    expect(merged.active).toBe(true);
  });

  it("is inactive when no streamer is active", () => {
    const merged = mergeSnapshots([
      { active: false, channels: [] },
      { active: false, channels: [] },
    ]);
    expect(merged.active).toBe(false);
    expect(merged.channels).toEqual([]);
  });

  it("is active when at least one streamer is active", () => {
    expect(mergeSnapshots([{ active: false, channels: [] }, { active: true, channels: [] }]).active).toBe(true);
  });
});
