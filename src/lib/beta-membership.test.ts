// src/lib/beta-membership.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireMembershipForLayout, requireMembership, claimMembership } from "./beta-membership";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock("@/lib/mongodb", () => ({ connectToDatabase: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/models/beta-membership", () => ({
  BetaMembership: {
    findOne: vi.fn(() => ({ lean: vi.fn().mockResolvedValue(null) })),
    updateOne: vi.fn(),
  },
}));

import { auth, currentUser } from "@clerk/nextjs/server";
import { BetaMembership } from "@/lib/models/beta-membership";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("beta-membership guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockFindOneResult(result: unknown) {
    (BetaMembership.findOne as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(result) });
  }

  it("requireMembershipForLayout redirects if no userId", async () => {
    (auth as any).mockResolvedValue({ userId: null });
    await requireMembershipForLayout();
    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("requireMembershipForLayout redirects if no membership", async () => {
    (auth as any).mockResolvedValue({ userId: "clerk_123" });
    mockFindOneResult(null);
    await requireMembershipForLayout();
    expect(redirect).toHaveBeenCalledWith("/beta/pending");
  });

  it("requireMembershipForLayout returns membership if approved", async () => {
    (auth as any).mockResolvedValue({ userId: "clerk_123" });
    const mockMembership = { clerkUserId: "clerk_123", status: "approved", applicationEmail: "a@b.com" };
    mockFindOneResult(mockMembership);
    const r = await requireMembershipForLayout();
    expect(r).toEqual(mockMembership);
  });

  it("requireMembership returns null if no auth", async () => {
    (auth as any).mockResolvedValue({ userId: null });
    const r = await requireMembership();
    expect(r).toBeNull();
  });

  it("requireMembership returns null if membership not approved", async () => {
    (auth as any).mockResolvedValue({ userId: "clerk_123" });
    mockFindOneResult({ status: "pending" });
    const r = await requireMembership();
    expect(r).toBeNull();
  });

  it("claimMembership returns 401 if no auth", async () => {
    (auth as any).mockResolvedValue({ userId: null });
    const r: any = await claimMembership("", "");
    expect(r.status).toBe(401);
  });

  it("claimMembership returns 400 if no clerk email", async () => {
    (auth as any).mockResolvedValue({ userId: "clerk_123" });
    (currentUser as any).mockResolvedValue({ primaryEmailAddress: null });
    const r: any = await claimMembership("clerk_123", "");
    expect(r.status).toBe(400);
  });

  it("claimMembership stamps clerkUserId on match", async () => {
    (auth as any).mockResolvedValue({ userId: "clerk_123" });
    (currentUser as any).mockResolvedValue({
      primaryEmailAddress: { emailAddress: "approved@example.com" }
    });
    (BetaMembership.findOne as any).mockResolvedValue({
      _id: "m1",
      applicationEmail: "approved@example.com",
      status: "approved",
      clerkUserId: null,
    });
    (BetaMembership.updateOne as any).mockResolvedValue({ modifiedCount: 1 });
    const r: any = await claimMembership("clerk_123", "approved@example.com");
    expect(r.ok).toBe(true);
    expect(BetaMembership.updateOne).toHaveBeenCalledWith(
      { _id: "m1" },
      expect.objectContaining({ $set: expect.objectContaining({ clerkUserId: "clerk_123" }) })
    );
  });

  it("claimMembership returns 409 on conflicting clerkUserId", async () => {
    (auth as any).mockResolvedValue({ userId: "clerk_999" });
    (currentUser as any).mockResolvedValue({
      primaryEmailAddress: { emailAddress: "approved@example.com" }
    });
    (BetaMembership.findOne as any).mockResolvedValue({
      _id: "m1",
      applicationEmail: "approved@example.com",
      status: "approved",
      clerkUserId: "clerk_123",
    });
    (BetaMembership.updateOne as any).mockResolvedValue({ modifiedCount: 1 });
    const r: any = await claimMembership("clerk_999", "approved@example.com");
    expect(r.status).toBe(409);
    expect(BetaMembership.updateOne).toHaveBeenCalledWith(
      { _id: "m1" },
      expect.objectContaining({ $set: expect.objectContaining({ conflictFlaggedAt: expect.any(Date), conflictingClerkUserId: "clerk_999" }) })
    );
  });
});