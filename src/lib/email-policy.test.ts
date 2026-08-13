// src/lib/email-policy.test.ts
import { describe, it, expect } from "vitest";
import {
  zEmailValid,
  isAcceptableEmail,
  normalizeEmailForDuplicateCheck,
  isDisposableEmail,
  isObviousTestEmail,
  isRoleAddress,
} from "./email-policy";

describe("email-policy", () => {
  it("zEmailValid accepts standard email", () => {
    const r = zEmailValid.safeParse("user@example.com");
    expect(r.success).toBe(true);
  });

  it("zEmailValid rejects invalid format", () => {
    const r = zEmailValid.safeParse("not-an-email");
    expect(r.success).toBe(false);
  });

  it("normalize strips plus-tag", () => {
    expect(normalizeEmailForDuplicateCheck("user+tag@gmail.com")).toBe("user@gmail.com");
    expect(normalizeEmailForDuplicateCheck("user+tag@outlook.com")).toBe("user@outlook.com");
  });

  it("normalize strips dots for Gmail only", () => {
    expect(normalizeEmailForDuplicateCheck("u.s.e.r@gmail.com")).toBe("user@gmail.com");
    expect(normalizeEmailForDuplicateCheck("u.s.e.r@outlook.com")).toBe("u.s.e.r@outlook.com");
    expect(normalizeEmailForDuplicateCheck("u.s.e.r@googlemail.com")).toBe("user@googlemail.com");
  });

  it("normalize preserves case-insensitivity", () => {
    expect(normalizeEmailForDuplicateCheck("User@Example.COM")).toBe("user@example.com");
  });

  it("isDisposableEmail catches known burner domains", () => {
    expect(isDisposableEmail("test@10minutemail.com")).toBe(true);
    expect(isDisposableEmail("user@gmail.com")).toBe(false);
  });

  it("isObviousTestEmail catches test@ patterns", () => {
    expect(isObviousTestEmail("test@test.com")).toBe(true);
    expect(isObviousTestEmail("a@b.com")).toBe(true);
    expect(isObviousTestEmail("user@example.com")).toBe(false);
  });

  it("isRoleAddress catches admin@, info@", () => {
    expect(isRoleAddress("admin@company.com")).toBe(true);
    expect(isRoleAddress("support@company.com")).toBe(true);
    expect(isRoleAddress("user@company.com")).toBe(false);
  });

  it("isAcceptableEmail rejects disposable + test + role", () => {
    expect(isAcceptableEmail("test@10minutemail.com")).toEqual({ ok: false, reason: "disposable_domain" });
    expect(isAcceptableEmail("test@test.com")).toEqual({ ok: false, reason: "test_email" });
    expect(isAcceptableEmail("admin@company.com")).toEqual({ ok: false, reason: "role_address" });
    expect(isAcceptableEmail("user+tag@gmail.com")).toEqual({ ok: true }); // plus allowed
    expect(isAcceptableEmail("user@gmail.com")).toEqual({ ok: true });
  });
});