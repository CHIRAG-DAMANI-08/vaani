import { describe, it, expect } from "vitest";
import { buildBetaApplicationQuery, normalizeBetaStatus } from "./beta-application-admin";

describe("beta application admin query helpers", () => {
  it("normalizes status filters", () => {
    expect(normalizeBetaStatus("all")).toBe("all");
    expect(normalizeBetaStatus("PENDING")).toBe("pending");
    expect(normalizeBetaStatus("approved")).toBe("approved");
  });

  it("builds a search filter for email and name queries", () => {
    const filter = buildBetaApplicationQuery({ status: "pending", search: "alice@example.com" });

    expect(filter).toMatchObject({
      status: "pending",
      $or: [
        { email: { $regex: "alice@example.com", $options: "i" } },
        { name: { $regex: "alice@example.com", $options: "i" } },
      ],
    });
  });
});
