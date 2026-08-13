// src/lib/email-policy.ts
import { z } from "zod";
import disposableDomains from "disposable-email-domains";

const PLUS_IN_LOCAL = /^[^@]*[+][^@]*@/;

const ROLE_LOCAL_PARTS = new Set([
  "admin", "administrator", "info", "support", "help",
  "sales", "marketing", "noreply", "no-reply", "donotreply",
  "test", "testing", "demo", "example", "sample",
  "root", "postmaster", "hostmaster", "webmaster",
]);

const TEST_DOMAINS = new Set([
  "test.com", "test.org",
  "localhost", "local", "fake.com", "dummy.com",
]);

const TEST_LOCAL_PARTS = new Set([
  "test", "testing", "a", "b", "c",
  "xxx", "yyy", "zzz", "asdf", "qwer",
]);

const GMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
]);

export const zEmailValid = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email.");

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return disposableDomains.includes(domain);
}

export function isRoleAddress(email: string): boolean {
  const localPart = email.split("@")[0]?.toLowerCase();
  if (!localPart) return false;
  return ROLE_LOCAL_PARTS.has(localPart);
}

export function isObviousTestEmail(email: string): boolean {
  const [localPart, domain] = email.toLowerCase().split("@");
  if (!localPart || !domain) return false;
  return TEST_DOMAINS.has(domain) || TEST_LOCAL_PARTS.has(localPart);
}

export function getRejectionReason(email: string): string | null {
  if (isDisposableEmail(email)) return "disposable_domain";
  if (isObviousTestEmail(email)) return "test_email";
  if (isRoleAddress(email)) return "role_address";
  return null;
}

export function normalizeEmailForDuplicateCheck(email: string): string {
  const [localPartRaw, domain] = email.toLowerCase().trim().split("@");
  if (!localPartRaw || !domain) return email.toLowerCase().trim();

  let localPart = localPartRaw;
  const plusIdx = localPart.indexOf("+");
  if (plusIdx > 0) {
    localPart = localPart.substring(0, plusIdx);
  }

  if (GMAIL_DOMAINS.has(domain)) {
    localPart = localPart.replace(/\./g, "");
  }

  return `${localPart}@${domain}`;
}

export function isAcceptableEmail(email: string):
  | { ok: true }
  | { ok: false; reason: string } {

  const parsed = zEmailValid.safeParse(email);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_format" };
  }

  const normalized = parsed.data;
  const reason = getRejectionReason(normalized);
  if (reason) {
    return { ok: false, reason };
  }

  return { ok: true };
}