# Beta Access — Bullet-Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hardened beta-access system for Vaani that prevents multi-account abuse (device/IP fingerprinting, email hardening) while following the existing design system for all new UI.

**Architecture:** Applications-before-accounts flow — public `/beta` form with layered anti-abuse → admin approval → Clerk sign-up with email-match enforcement → membership gate on all dashboard routes. All layers are friction-raising, not 100% prevention; the membership gate is the real enforcement.

**Tech Stack:** Next.js 16.2.2, TypeScript, MongoDB/Mongoose (NOT Prisma/Postgres), Clerk `@clerk/nextjs` v7, zod v4, `@fingerprintjs/fingerprintjs` v4, `disposable-email-domains` npm, Resend (email), existing in-memory `rate-limit.ts` pattern, no Redis, no extra infra.

## Global Constraints

- **No new infra** — 1GB Oracle free-tier VM, single Node process, in-memory stores only.
- **Design system compliance** — Reuse existing tokens/components exactly (`.liquid-glass`, `.glass-card`, `font-sans`/`font-serif italic` headings, `#2DD4BF` teal active, `#F5821F` saffron, `rounded-xl`/`rounded-full`, `max-w-5xl` dashboard, `max-w-md` forms).
- **Anti-abuse = layered friction** — device hash (SHA-256 of FingerprintJS visitorId) + per-IP rate limits (3/hr, 5/day) + cardinality checks (flag review if >3 apps per device/IP) + disposable-email blocklist + email normalization for duplicate detection (strip +tag, strip Gmail dots). **No plus-address rejection** — false-positive risk too high; normalize instead.
- **Clerk patterns** — Use existing `proxy.ts` as Clerk middleware (thin session layer), add `requireMembership()` resource-level guard in dashboard layout + all API routes. Email-match enforced on first sign-in via `/api/beta/claim` that stamps `clerkUserId` on membership (sparse unique index).
- **Tests** — vitest for all new logic (email policy, fingerprint hash, membership gate), integration tests for server actions, type-check + build as gates.
- **Commits** — One commit per task, conventional messages (`feat:`, `fix:`, `test:`).

---

## File Structure

### New Files
| Path | Responsibility |
|------|----------------|
| `src/lib/email-policy.ts` | Zod validators, rejection checks, normalization, disposable-email detection |
| `src/lib/device-fingerprint.ts` | SHA-256 hashing of FingerprintJS visitorId, cardinality helpers |
| `src/lib/beta-membership.ts` | `requireMembershipForLayout()`, `requireMembership()` guards, claim logic |
| `src/lib/models/beta-application.ts` | Mongoose schema: email, name, deviceHash, ip, interests, status, reviewReason, normalizedEmail |
| `src/lib/models/beta-membership.ts` | Mongoose schema: applicationEmail (unique), clerkUserId (sparse unique), status, claimedAt, conflictFlaggedAt |
| `src/app/actions/join-beta.ts` | Server action for public beta application (replaces waitlist) |
| `src/app/api/beta/apply/route.ts` | POST endpoint (mirrors action for non-JS clients) |
| `src/app/api/beta/claim/route.ts` | POST — called once after Clerk sign-in to bind clerkUserId |
| `src/app/api/admin/beta-applications/route.ts` | GET (paginated, filtered) + POST approve/reject |
| `src/app/api/admin/beta-applications/export/route.ts` | CSV export |
| `src/app/api/admin/beta-applications/[id]/approve/route.ts` | Approve action |
| `src/app/api/admin/beta-applications/[id]/reject/route.ts` | Reject action |
| `src/app/beta/page.tsx` | Public application page (landing theme) |
| `src/app/beta/accepted/page.tsx` | Post-submit confirmation |
| `src/app/beta/pending/page.tsx` | "Not approved yet" page (shown after sign-in without membership) |
| `src/app/(dashboard)/admin/beta/page.tsx` | Admin review queue (dashboard theme) |
| `src/app/components/BetaApplicationForm.tsx` | Form component with interest multi-select |
| `src/app/components/InterestPillGroup.tsx` | Multi-select language pills |
| `src/app/components/admin/BetaApplicationsTable.tsx` | Admin table with actions |
| `src/app/components/admin/BetaApplicationRow.tsx` | Row component (desktop table + mobile card) |
| `src/app/components/admin/AdminToolbar.tsx` | Search/filter/export toolbar |

### Modified Files
| Path | Change |
|------|--------|
| `src/app/(dashboard)/layout.tsx` | Replace bare `auth()` with `requireMembershipForLayout()` |
| `src/proxy.ts` | Drop `createRouteMatcher`/`auth.protect()` (deprecated); keep `clerkMiddleware()` only |
| `src/app/api/key/status/route.ts` | Use `requireMembership()` guard |
| `src/app/api/channels/route.ts` | Use `requireMembership()` guard |
| `src/app/api/obs/credentials/route.ts` | Use `requireMembership()` guard |
| `src/app/api/sessions/route.ts` | Use `requireMembership()` guard |
| `src/app/actions/join-waitlist.ts` | **Deprecate** — keep for existing waitlist entries; new flow uses `join-beta.ts` |
| `src/lib/rate-limit.ts` | Add `beta-ip-hour` and `beta-ip-day` pools |

---

## Interfaces

### `src/lib/email-policy.ts`
```typescript
// Export
export const zEmailValid: z.ZodString;
export function isDisposableEmail(email: string): boolean;
export function isObviousTestEmail(email: string): boolean;
export function isRoleAddress(email: string): boolean;
export function getRejectionReason(email: string): string | null;
export function normalizeEmailForDuplicateCheck(email: string): string;
export function isAcceptableEmail(email: string): { ok: true } | { ok: false; reason: string };
```

### `src/lib/device-fingerprint.ts`
```typescript
export function hashDeviceId(visitorId: string): string;
export async function checkDeviceCardinality(deviceHash: string): Promise<{ flagged: boolean; count: number }>;
export async function checkIpCardinality(ip: string): Promise<{ flagged: boolean; count: number }>;
```

### `src/lib/beta-membership.ts`
```typescript
export async function requireMembershipForLayout(): Promise<BetaMembershipDoc>;
export async function requireMembership(): Promise<{ userId: string; email: string; applicationEmail: string } | null>;
export async function claimMembership(userId: string, clerkEmail: string): Promise<{ ok: true } | { error: string; status: number }>;
```

### `src/lib/models/beta-application.ts`
```typescript
interface BetaApplicationDoc {
  email: string;
  name?: string;
  deviceHash?: string;
  ipAddress: string;
  interests: string[]; // languageIds
  status: "pending" | "approved" | "rejected" | "review";
  reviewReason?: "device_cardinality" | "ip_cardinality" | "disposable_email" | "test_email";
  normalizedEmail: string;
  attemptCount: number;
  emailSent: boolean;
  reviewedAt?: Date;
  reviewedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### `src/lib/models/beta-membership.ts`
```typescript
interface BetaMembershipDoc {
  applicationEmail: string; // unique, indexed
  clerkUserId?: string; // sparse unique index
  status: "approved" | "revoked";
  claimedAt?: Date;
  conflictFlaggedAt?: Date;
  conflictingClerkUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Tasks

### Task 1: Email Policy Library (`src/lib/email-policy.ts`)

**Files:**
- Create: `src/lib/email-policy.ts`
- Test: `src/lib/email-policy.test.ts`

**Interfaces:**
- Consumes: none (leaf utility)
- Produces: `zEmailValid`, `isAcceptableEmail()`, `normalizeEmailForDuplicateCheck()`, `isDisposableEmail()`, rejection helpers

- [ ] **Step 1: Write failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/lib/email-policy.test.ts`
Expected: All tests FAIL (functions not defined)

- [ ] **Step 3: Implement `email-policy.ts`**

```typescript
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
  "test.com", "example.com", "test.org", "example.org",
  "localhost", "local", "fake.com", "dummy.com",
]);

const TEST_LOCAL_PARTS = new Set([
  "test", "testing", "a", "b", "c", "user", "email", "mail",
  "xxx", "yyy", "zzz", "asdf", "qwer", "demo", "sample",
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
  if (isObviousTestEmail(email)) return "test_email";
  if (isRoleAddress(email)) return "role_address";
  if (isDisposableEmail(email)) return "disposable_domain";
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
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/lib/email-policy.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/email-policy.ts src/lib/email-policy.test.ts
git commit -m "feat: add email-policy with validation, normalization, disposable detection"
```

---

### Task 2: Device Fingerprint Library (`src/lib/device-fingerprint.ts`)

**Files:**
- Create: `src/lib/device-fingerprint.ts`
- Test: `src/lib/device-fingerprint.test.ts`

**Interfaces:**
- Consumes: none (leaf utility)
- Produces: `hashDeviceId()`, `checkDeviceCardinality()`, `checkIpCardinality()`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/device-fingerprint.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashDeviceId, checkDeviceCardinality, checkIpCardinality } from "./device-fingerprint";
import { BetaApplication } from "@/lib/models/beta-application";

vi.mock("@/lib/mongodb", () => ({ connectToDatabase: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/models/beta-application");

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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/lib/device-fingerprint.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `device-fingerprint.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/lib/device-fingerprint.test.ts`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/device-fingerprint.ts src/lib/device-fingerprint.test.ts
git commit -m "feat: add device-fingerprint with SHA-256 hashing and cardinality checks"
```

---

### Task 3: Beta Application Model (`src/lib/models/beta-application.ts`)

**Files:**
- Create: `src/lib/models/beta-application.ts`

**Interfaces:**
- Consumes: none
- Produces: `BetaApplication` Mongoose model

- [ ] **Step 1: Write model file**

```typescript
// src/lib/models/beta-application.ts
import { Schema, model, models } from "mongoose";

const betaApplicationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    deviceHash: {
      type: String,
      index: true,
      default: null,
    },
    ipAddress: {
      type: String,
      index: true,
      default: null,
    },
    interests: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "review"],
      default: "pending",
      index: true,
    },
    reviewReason: {
      type: String,
      enum: ["device_cardinality", "ip_cardinality", "disposable_email", "test_email"],
      default: null,
    },
    normalizedEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
      default: null,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "beta_applications",
  }
);

// Compound index for duplicate detection by normalized email
betaApplicationSchema.index({ normalizedEmail: 1 }, { unique: true, sparse: true });

export const BetaApplication =
  models.BetaApplication || model("BetaApplication", betaApplicationSchema);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/models/beta-application.ts
git commit -m "feat: add BetaApplication model with normalizedEmail unique index"
```

---

### Task 4: Beta Membership Model (`src/lib/models/beta-membership.ts`)

**Files:**
- Create: `src/lib/models/beta-membership.ts`

**Interfaces:**
- Consumes: none
- Produces: `BetaMembership` Mongoose model

- [ ] **Step 1: Write model file**

```typescript
// src/lib/models/beta-membership.ts
import { Schema, model, models } from "mongoose";

const betaMembershipSchema = new Schema(
  {
    applicationEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    clerkUserId: {
      type: String,
      index: true,
      unique: true,
      sparse: true, // null allowed until claimed
      default: null,
    },
    status: {
      type: String,
      enum: ["approved", "revoked"],
      default: "approved",
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    conflictFlaggedAt: {
      type: Date,
      default: null,
    },
    conflictingClerkUserId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "beta_memberships",
  }
);

export const BetaMembership =
  models.BetaMembership || model("BetaMembership", betaMembershipSchema);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/models/beta-membership.ts
git commit -m "feat: add BetaMembership model with sparse unique clerkUserId index"
```

---

### Task 5: Beta Membership Guard (`src/lib/beta-membership.ts`)

**Files:**
- Create: `src/lib/beta-membership.ts`
- Test: `src/lib/beta-membership.test.ts`

**Interfaces:**
- Consumes: `BetaMembership` model, Clerk `auth()`/`currentUser()`
- Produces: `requireMembershipForLayout()`, `requireMembership()`, `claimMembership()`

- [ ] **Step 1: Write failing tests**

```typescript
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
    findOne: vi.fn(),
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

  it("requireMembershipForLayout redirects if no userId", async () => {
    (auth as any).mockResolvedValue({ userId: null });
    await expect(requireMembershipForLayout()).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("requireMembershipForLayout redirects if no membership", async () => {
    (auth as any).mockResolvedValue({ userId: "clerk_123" });
    (BetaMembership.findOne as any).mockResolvedValue(null);
    await expect(requireMembershipForLayout()).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith("/beta/pending");
  });

  it("requireMembershipForLayout returns membership if approved", async () => {
    (auth as any).mockResolvedValue({ userId: "clerk_123" });
    const mockMembership = { clerkUserId: "clerk_123", status: "approved", applicationEmail: "a@b.com" };
    (BetaMembership.findOne as any).mockResolvedValue(mockMembership);
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
    (BetaMembership.findOne as any).mockResolvedValue({ status: "pending" });
    const r = await requireMembership();
    expect(r).toBeNull();
  });

  it("claimMembership returns 401 if no auth", async () => {
    (auth as any).mockResolvedValue({ userId: null });
    const r = await claimMembership("", "");
    expect(r.status).toBe(401);
  });

  it("claimMembership returns 400 if no clerk email", async () => {
    (auth as any).mockResolvedValue({ userId: "clerk_123" });
    (currentUser as any).mockResolvedValue({ primaryEmailAddress: null });
    const r = await claimMembership("clerk_123", "");
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
    const r = await claimMembership("clerk_123", "approved@example.com");
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
    const r = await claimMembership("clerk_999", "approved@example.com");
    expect(r.status).toBe(409);
    expect(BetaMembership.updateOne).toHaveBeenCalledWith(
      { _id: "m1" },
      expect.objectContaining({ $set: expect.objectContaining({ conflictFlaggedAt: expect.any(Date), conflictingClerkUserId: "clerk_999" }) })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/lib/beta-membership.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `beta-membership.ts`**

```typescript
// src/lib/beta-membership.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaMembership } from "@/lib/models/beta-membership";

export async function requireMembershipForLayout() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectToDatabase();
  const membership = await BetaMembership.findOne({ clerkUserId: userId }).lean();
  if (!membership || membership.status !== "approved") {
    redirect("/beta/pending");
  }
  return membership;
}

export async function requireMembership(): Promise<{ userId: string; email: string; applicationEmail: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  await connectToDatabase();
  const membership = await BetaMembership.findOne({ clerkUserId: userId }).lean();
  if (!membership || membership.status !== "approved") return null;

  return { userId, email: membership.applicationEmail, applicationEmail: membership.applicationEmail };
}

export async function claimMembership(
  userId: string,
  _unused: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const { userId: authUserId } = await auth();
  if (!authUserId || authUserId !== userId) {
    return { error: "unauthorized", status: 401 };
  }

  const user = await currentUser();
  const clerkEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase().trim();
  if (!clerkEmail) {
    return { error: "no verified email on Clerk account", status: 400 };
  }

  await connectToDatabase();

  const membership = await BetaMembership.findOne({
    applicationEmail: clerkEmail,
    status: "approved",
  });

  if (!membership) {
    return { error: "no approved membership for this email", status: 403 };
  }

  if (membership.clerkUserId && membership.clerkUserId !== userId) {
    await BetaMembership.updateOne(
      { _id: membership._id },
      { 
        $set: { 
          conflictFlaggedAt: new Date(), 
          conflictingClerkUserId: userId 
        } 
      }
    );
    return { error: "this email is already claimed by another Clerk account", status: 409 };
  }

  await BetaMembership.updateOne(
    { _id: membership._id },
    { 
      $set: { 
        clerkUserId: userId, 
        claimedAt: new Date() 
      } 
    }
  );

  return { ok: true };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/lib/beta-membership.test.ts`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/beta-membership.ts src/lib/beta-membership.test.ts
git commit -m "feat: add beta-membership guards (requireMembership, claimMembership)"
```

---

### Task 6: Update Dashboard Layout Guard

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx:10-16`
- Test: (integration — covered by layout guard test in Task 5)

**Interfaces:**
- Consumes: `requireMembershipForLayout()` from Task 5
- Produces: gated dashboard layout

- [ ] **Step 1: Read current file**

```bash
# Already read — current lines 10-16:
const { userId } = await auth();
if (!userId) {
  redirect("/sign-in");
}
```

- [ ] **Step 2: Edit to use `requireMembershipForLayout()`**

```typescript
// src/app/(dashboard)/layout.tsx
import { requireMembershipForLayout } from "@/lib/beta-membership";
import { DashboardShell } from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMembershipForLayout(); // redirects to /sign-in or /beta/pending
  return <DashboardShell>{children}</DashboardShell>;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/layout.tsx
git commit -m "feat: gate dashboard layout with beta membership check"
```

---

### Task 7: Update Proxy Middleware (Drop Deprecated Matcher)

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: none
- Produces: thin `clerkMiddleware()` only

- [ ] **Step 1: Read current file** (assume it uses `createRouteMatcher` + `auth.protect()`)

- [ ] **Step 2: Edit to thin middleware**

```typescript
// src/proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(); // session population only; no route matching

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "refactor: drop deprecated createRouteMatcher from proxy.ts (Clerk middleware)"
```

---

### Task 8: Update All API Routes to Use `requireMembership()`

**Files:**
- Modify: `src/app/api/key/status/route.ts`, `src/app/api/channels/route.ts`, `src/app/api/obs/credentials/route.ts`, `src/app/api/sessions/route.ts`, `src/app/api/sessions/export/route.ts`, `src/app/api/obs/status/route.ts`, `src/app/api/key/route.ts`, `src/app/api/key/validate/route.ts`, `src/app/api/key/update/route.ts`, `src/app/api/test-pipeline/route.ts`

**Pattern:** Replace bare `auth()` check with `requireMembership()`

```typescript
// Before (key/status/route.ts pattern)
const { userId } = await auth();
if (!userId) {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

// After
import { requireMembership } from "@/lib/beta-membership";
const m = await requireMembership();
if (!m) {
  return NextResponse.json({ error: "BETA_ACCESS_REQUIRED" }, { status: 403 });
}
// Use m.userId
```

- [ ] **Step 1: Edit each route file** (10 files)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/key/status/route.ts src/app/api/channels/route.ts src/app/api/obs/credentials/route.ts src/app/api/sessions/route.ts src/app/api/sessions/export/route.ts src/app/api/obs/status/route.ts src/app/api/key/route.ts src/app/api/key/validate/route.ts src/app/api/key/update/route.ts src/app/api/test-pipeline/route.ts
git commit -m "feat: gate all API routes with beta membership check"
```

---

### Task 9: Extend Rate-Limit with IP Pools

**Files:**
- Modify: `src/lib/rate-limit.ts`

**Interfaces:**
- Consumes: none
- Produces: two new pools `beta-ip-hour`, `beta-ip-day`

- [ ] **Step 1: Edit `POOLS` object**

```typescript
// src/lib/rate-limit.ts — add to POOLS
const POOLS: Record<string, PoolConfig> = {
  "key-mutation": { maxRequests: 5, windowMs: isDev ? 10 * 1000 : 15 * 60 * 1000 },
  "key-delete": { maxRequests: 10, windowMs: isDev ? 10 * 1000 : 60 * 60 * 1000 },
  // New beta IP pools
  "beta-ip-hour": { maxRequests: 3, windowMs: 60 * 60 * 1000 },       // 3 per IP per hour
  "beta-ip-day": { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 },  // 5 per IP per day
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat: add beta IP rate limit pools (3/hr, 5/day)"
```

---

### Task 10: Beta Application Server Action (`src/app/actions/join-beta.ts`)

**Files:**
- Create: `src/app/actions/join-beta.ts`
- Test: `src/app/actions/join-beta.test.ts`

**Interfaces:**
- Consumes: `email-policy`, `device-fingerprint`, `rate-limit`, `BetaApplication` model
- Produces: `JoinBetaResponse` discriminated union

- [ ] **Step 1: Write failing tests**

```typescript
// src/app/actions/join-beta.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { joinBeta } from "./join-beta";

vi.mock("@/lib/mongodb", () => ({ connectToDatabase: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/models/beta-application", () => ({
  BetaApplication: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ allowed: true })),
}));
vi.mock("@/lib/email-policy", () => ({
  isAcceptableEmail: vi.fn(() => ({ ok: true })),
  normalizeEmailForDuplicateCheck: vi.fn((e) => e.toLowerCase()),
}));
vi.mock("@/lib/device-fingerprint", () => ({
  hashDeviceId: vi.fn((v) => "hashed-" + v),
  checkDeviceCardinality: vi.fn(() => Promise.resolve({ flagged: false, count: 0 })),
  checkIpCardinality: vi.fn(() => Promise.resolve({ flagged: false, count: 0 })),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Map([["x-forwarded-for", "1.2.3.4"]])),
}));

import { BetaApplication } from "@/lib/models/beta-application";
import { rateLimit } from "@/lib/rate-limit";
import { isAcceptableEmail } from "@/lib/email-policy";
import { hashDeviceId, checkDeviceCardinality, checkIpCardinality } from "@/lib/device-fingerprint";

describe("joinBeta action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid email format", async () => {
    (isAcceptableEmail as any).mockReturnValue({ ok: false, reason: "invalid_format" });
    const fd = new FormData();
    fd.append("email", "bad-email");
    const r = await joinBeta(null, fd);
    expect(r.ok).toBe(false);
    expect(r.state).toBe("validation_error");
  });

  it("rejects disposable email", async () => {
    (isAcceptableEmail as any).mockReturnValue({ ok: false, reason: "disposable_domain" });
    const fd = new FormData();
    fd.append("email", "test@10minutemail.com");
    const r = await joinBeta(null, fd);
    expect(r.ok).toBe(false);
    expect(r.state).toBe("validation_error");
  });

  it("rate limits per email", async () => {
    (rateLimit as any).mockReturnValue({ allowed: false });
    const fd = new FormData();
    fd.append("email", "user@example.com");
    const r = await joinBeta(null, fd);
    expect(r.ok).toBe(false);
    expect(r.state).toBe("server_error");
  });

  it("creates application on success", async () => {
    (BetaApplication.findOne as any).mockResolvedValue(null);
    (BetaApplication.findOneAndUpdate as any).mockResolvedValue({ 
      email: "user@example.com", 
      status: "pending" 
    });
    const fd = new FormData();
    fd.append("email", "user@example.com");
    fd.append("name", "Test User");
    fd.append("deviceId", "visitor-123");
    fd.append("interests", "hindi,tamil");
    const r = await joinBeta(null, fd);
    expect(r.ok).toBe(true);
    expect(r.state).toBe("success");
    expect(BetaApplication.findOneAndUpdate).toHaveBeenCalled();
  });

  it("flags review on device cardinality", async () => {
    (checkDeviceCardinality as any).mockResolvedValue({ flagged: true, count: 3 });
    (BetaApplication.findOneAndUpdate as any).mockResolvedValue({ 
      email: "user@example.com", 
      status: "review",
      reviewReason: "device_cardinality"
    });
    const fd = new FormData();
    fd.append("email", "user@example.com");
    fd.append("deviceId", "visitor-123");
    const r = await joinBeta(null, fd);
    expect(r.ok).toBe(true);
    expect(r.state).toBe("review");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/app/actions/join-beta.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `join-beta.ts`**

```typescript
// src/app/actions/join-beta.ts
"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";
import { rateLimit } from "@/lib/rate-limit";
import { isAcceptableEmail, normalizeEmailForDuplicateCheck } from "@/lib/email-policy";
import { hashDeviceId, checkDeviceCardinality, checkIpCardinality } from "@/lib/device-fingerprint";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL ?? "Vaani <onboarding@resend.dev>";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export type JoinBetaResponse =
  | { ok: true; state: "success"; message: string }
  | { ok: true; state: "review"; message: string }
  | { ok: true; state: "duplicate"; message: string }
  | { ok: false; state: "validation_error"; message: string }
  | { ok: false; state: "server_error"; message: string };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded && process.env.TRUST_PROXY === "true") {
    return forwarded.split(",")[0].trim();
  }
  return forwarded?.split(",")[0].trim() ?? "unknown";
}

export async function joinBeta(
  _prevState: JoinBetaResponse | null,
  formData: FormData
): Promise<JoinBetaResponse> {
  const emailRaw = formData.get("email");
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  const nameRaw = formData.get("name");
  const name = typeof nameRaw === "string" ? nameRaw.trim() : undefined;
  const deviceIdRaw = formData.get("deviceId");
  const deviceId = typeof deviceIdRaw === "string" ? deviceIdRaw : "";
  const interestsRaw = formData.get("interests");
  const interests = typeof interestsRaw === "string" 
    ? interestsRaw.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  // 1. Email rate limit (5/min per email)
  const rl = rateLimit(`beta:${email}`, { maxRequests: 5, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return { ok: false, state: "server_error", message: "Too many attempts. Please try again later." };
  }

  // 2. Email validation (format, disposable, test, role)
  const emailCheck = isAcceptableEmail(email);
  if (!emailCheck.ok) {
    const messages: Record<string, string> = {
      invalid_format: "Enter a valid email.",
      disposable_domain: "Please use a permanent email address.",
      test_email: "Enter a real email address.",
      role_address: "Role addresses (admin@, info@, etc.) are not accepted.",
    };
    return { ok: false, state: "validation_error", message: messages[emailCheck.reason] ?? "Invalid email." };
  }

  // 3. IP rate limits
  const ip = await getClientIp();
  const ipHour = rateLimit(`beta-ip-hour:${ip}`, { maxRequests: 3, windowMs: 60 * 60 * 1000 });
  const ipDay = rateLimit(`beta-ip-day:${ip}`, { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 });
  if (!ipHour.allowed || !ipDay.allowed) {
    return { ok: false, state: "server_error", message: "Too many applications from this network." };
  }

  // 4. Device hash + cardinality
  const deviceHash = deviceId ? hashDeviceId(deviceId) : null;
  let reviewReason: string | null = null;
  if (deviceHash) {
    const { flagged } = await checkDeviceCardinality(deviceHash);
    if (flagged) reviewReason = "device_cardinality";
  }
  // 5. IP cardinality
  const { flagged: ipFlagged } = await checkIpCardinality(ip);
  if (ipFlagged && !reviewReason) reviewReason = "ip_cardinality";

  // 6. Normalized email for duplicate detection
  const normalizedEmail = normalizeEmailForDuplicateCheck(email);

  try {
    await connectToDatabase();

    // Check existing by raw or normalized email
    const existing = await BetaApplication.findOne({
      $or: [{ email }, { normalizedEmail }],
    });

    if (existing) {
      // Increment attempt count, never overwrite details
      await BetaApplication.updateOne(
        { _id: existing._id },
        { $inc: { attemptCount: 1 } }
      );
      return { ok: true, state: "duplicate", message: "You've already applied. We'll notify you when it's your turn!" };
    }

    // Create application
    const application = await BetaApplication.create({
      email,
      name,
      deviceHash,
      ipAddress: ip,
      interests,
      status: reviewReason ? "review" : "pending",
      reviewReason,
      normalizedEmail,
      attemptCount: 1,
      emailSent: false,
    });

    // Send confirmation email
    if (resend) {
      const displayName = application.name ?? "there";
      try {
        await resend.emails.send({
          from: resendFrom,
          to: email,
          subject: "You're on the Vaani beta waitlist",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 560px; margin: 0 auto; padding: 24px;">
              <h1 style="font-size: 24px; margin: 0 0 16px;">You're on the Vaani beta waitlist</h1>
              <p style="margin: 0 0 16px;">Hi ${displayName},</p>
              <p style="margin: 0 0 16px;">Thanks for applying to the beta. We've saved your spot and will email you when your seat opens up.</p>
              <p style="margin: 0;">If you have any questions, just reply to this message.</p>
            </div>
          `,
        });
        await BetaApplication.updateOne({ _id: application._id }, { emailSent: true });
      } catch (error) {
        logger.error({ err: error }, "Beta application email failed");
      }
    } else {
      logger.warn("RESEND_API_KEY not configured; beta application email not sent");
    }

    return { 
      ok: true, 
      state: reviewReason ? "review" : "success", 
      message: reviewReason 
        ? "Application submitted. Pending review." 
        : "You're on the waitlist." 
    };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return { ok: true, state: "duplicate", message: "You've already applied. We'll notify you when it's your turn!" };
    }
    logger.error({ err: error }, "Beta application failed");
    return { ok: false, state: "server_error", message: "Something went wrong. Please try again." };
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/app/actions/join-beta.test.ts`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/join-beta.ts src/app/actions/join-beta.test.ts
git commit -m "feat: add join-beta server action with layered anti-abuse"
```

---

### Task 11: Beta Apply API Route (Mirror of Action)

**Files:**
- Create: `src/app/api/beta/apply/route.ts`

**Interfaces:**
- Consumes: `joinBeta` action logic (reuse)
- Produces: POST endpoint returning same `JoinBetaResponse`

- [ ] **Step 1: Implement route**

```typescript
// src/app/api/beta/apply/route.ts
import { NextResponse } from "next/server";
import { joinBeta } from "@/app/actions/join-beta";

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await joinBeta(null, formData);
  return NextResponse.json(result);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/beta/apply/route.ts
git commit -m "feat: add /api/beta/apply endpoint mirroring join-beta action"
```

---

### Task 12: Claim Membership API Route

**Files:**
- Create: `src/app/api/beta/claim/route.ts`
- Test: `src/app/api/beta/claim/route.test.ts`

**Interfaces:**
- Consumes: `claimMembership()` from Task 5
- Produces: POST endpoint

- [ ] **Step 1: Write failing tests**

```typescript
// src/app/api/beta/claim/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock("@/lib/mongodb", () => ({ connectToDatabase: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/models/beta-membership", () => ({
  BetaMembership: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));

import { auth, currentUser } from "@clerk/nextjs/server";
import { BetaMembership } from "@/lib/models/beta-membership";

describe("/api/beta/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if no auth", async () => {
    (auth as any).mockResolvedValue({ userId: null });
    const req = new Request("http://localhost/api/beta/claim", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 if no verified email", async () => {
    (auth as any).mockResolvedValue({ userId: "clerk_123" });
    (currentUser as any).mockResolvedValue({ primaryEmailAddress: null });
    const req = new Request("http://localhost/api/beta/claim", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful claim", async () => {
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
    const req = new Request("http://localhost/api/beta/claim", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 409 on conflict", async () => {
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
    const req = new Request("http://localhost/api/beta/claim", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/app/api/beta/claim/route.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement route**

```typescript
// src/app/api/beta/claim/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { claimMembership } from "@/lib/beta-membership";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await claimMembership(userId, "");
  if (result.ok) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/app/api/beta/claim/route.test.ts`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/app/api/beta/claim/route.ts src/app/api/beta/claim/route.test.ts
git commit -m "feat: add /api/beta/claim endpoint for clerkUserId binding"
```

---

### Task 13: Admin Beta Applications API (List + Approve/Reject)

**Files:**
- Create: `src/app/api/admin/beta-applications/route.ts`
- Create: `src/app/api/admin/beta-applications/export/route.ts`
- Create: `src/app/api/admin/beta-applications/[id]/approve/route.ts`
- Create: `src/app/api/admin/beta-applications/[id]/reject/route.ts`

**Interfaces:**
- Consumes: `BetaApplication`, `BetaMembership` models, `requireMembership()` (admin check)
- Produces: GET (paginated), POST approve/reject, GET export

- [ ] **Step 1: Implement list route**

```typescript
// src/app/api/admin/beta-applications/route.ts
import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/beta-membership";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";
import { BetaMembership } from "@/lib/models/beta-membership";

export async function GET(request: Request) {
  const m = await requireMembership();
  if (!m) return NextResponse.json({ error: "BETA_ACCESS_REQUIRED" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (status !== "all") filter.status = status;
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
    ];
  }

  const [applications, total] = await Promise.all([
    BetaApplication.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    BetaApplication.countDocuments(filter),
  ]);

  return NextResponse.json({
    applications,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const m = await requireMembership();
  if (!m) return NextResponse.json({ error: "BETA_ACCESS_REQUIRED" }, { status: 403 });

  const { applicationId, action } = await request.json(); // action: "approve" | "reject"
  if (!applicationId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const application = await BetaApplication.findById(applicationId);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (action === "approve") {
    application.status = "approved";
    application.reviewedAt = new Date();
    application.reviewedBy = m.userId;
    await application.save();

    // Create membership record (approved, unclaimed)
    await BetaMembership.create({
      applicationEmail: application.email,
      status: "approved",
    });
  } else {
    application.status = "rejected";
    application.reviewedAt = new Date();
    application.reviewedBy = m.userId;
    await application.save();
  }

  return NextResponse.json({ ok: true, application });
}
```

- [ ] **Step 2: Implement export route**

```typescript
// src/app/api/admin/beta-applications/export/route.ts
import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/beta-membership";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";

export async function GET(request: Request) {
  const m = await requireMembership();
  if (!m) return NextResponse.json({ error: "BETA_ACCESS_REQUIRED" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";

  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (status !== "all") filter.status = status;

  const applications = await BetaApplication.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  const csv = [
    "Email,Name,DeviceHash,IP,Interests,Status,ReviewReason,NormalizedEmail,AttemptCount,CreatedAt,ReviewedAt,ReviewedBy",
    ...applications.map(a => [
      a.email,
      a.name ?? "",
      a.deviceHash ?? "",
      a.ipAddress,
      a.interests.join(";"),
      a.status,
      a.reviewReason ?? "",
      a.normalizedEmail ?? "",
      a.attemptCount,
      a.createdAt.toISOString(),
      a.reviewedAt?.toISOString() ?? "",
      a.reviewedBy ?? "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="beta-applications-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
```

- [ ] **Step 3: Implement approve route**

```typescript
// src/app/api/admin/beta-applications/[id]/approve/route.ts
import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/beta-membership";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";
import { BetaMembership } from "@/lib/models/beta-membership";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const m = await requireMembership();
  if (!m) return NextResponse.json({ error: "BETA_ACCESS_REQUIRED" }, { status: 403 });

  const { id } = await params;
  await connectToDatabase();

  const application = await BetaApplication.findById(id);
  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  application.status = "approved";
  application.reviewedAt = new Date();
  application.reviewedBy = m.userId;
  await application.save();

  await BetaMembership.create({
    applicationEmail: application.email,
    status: "approved",
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Implement reject route**

```typescript
// src/app/api/admin/beta-applications/[id]/reject/route.ts
import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/beta-membership";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const m = await requireMembership();
  if (!m) return NextResponse.json({ error: "BETA_ACCESS_REQUIRED" }, { status: 403 });

  const { id } = await params;
  await connectToDatabase();

  const application = await BetaApplication.findById(id);
  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  application.status = "rejected";
  application.reviewedAt = new Date();
  application.reviewedBy = m.userId;
  await application.save();

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/beta-applications/route.ts src/app/api/admin/beta-applications/export/route.ts src/app/api/admin/beta-applications/[id]/approve/route.ts src/app/api/admin/beta-applications/[id]/reject/route.ts
git commit -m "feat: add admin beta applications API (list, approve, reject, export)"
```

---

### Task 14: Public Beta Page (`/beta`)

**Files:**
- Create: `src/app/beta/page.tsx`
- Create: `src/app/components/BetaApplicationForm.tsx`
- Create: `src/app/components/InterestPillGroup.tsx`

**Interfaces:**
- Consumes: `joinBeta` action, `WaitlistModal` patterns, design system tokens
- Produces: Public landing-theme page with form

- [ ] **Step 1: Implement `InterestPillGroup.tsx`**

```tsx
// src/app/components/InterestPillGroup.tsx
"use client";

import { useState } from "react";
import { LANG_BY_BCP47 } from "@/lib/language-registry";

interface InterestPillGroupProps {
  selected: string[];
  onChange: (languages: string[]) => void;
  className?: string;
}

const LANGUAGES = [
  { id: "hi", name: "Hindi", script: "हि" },
  { id: "ta", name: "Tamil", script: "த" },
  { id: "te", name: "Telugu", script: "తె" },
  { id: "kn", name: "Kannada", script: "ಕ" },
  { id: "mr", name: "Marathi", script: "मर" },
  { id: "bn", name: "Bengali", script: "ব" },
  { id: "gu", name: "Gujarati", script: "ગુ" },
  { id: "ml", name: "Malayalam", script: "മ" },
];

export function InterestPillGroup({ selected, onChange, className = "" }: InterestPillGroupProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="group" aria-label="Language interests">
      {LANGUAGES.map((lang) => {
        const isSelected = selected.includes(lang.id);
        return (
          <button
            key={lang.id}
            type="button"
            onClick={() => {
              const next = isSelected
                ? selected.filter((id) => id !== lang.id)
                : [...selected, lang.id];
              onChange(next);
            }}
            className={`
              liquid-glass border-white/10 rounded-full px-3 py-1.5 text-xs font-sans font-medium transition-all
              ${isSelected
                ? "bg-white text-black border-white shadow-sm"
                : "text-neutral-400 hover:text-white hover:border-white/25"
              }
            `}
            aria-pressed={isSelected}
          >
            <span className="font-serif italic mr-1">{lang.script}</span>
            {lang.name}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Implement `BetaApplicationForm.tsx`**

```tsx
// src/app/components/BetaApplicationForm.tsx
"use client";

import { useState, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { joinBeta } from "@/app/actions/join-beta";
import { InterestPillGroup } from "./InterestPillGroup";

export function BetaApplicationForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "review" | "duplicate" | "error">("idle");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [deviceId] = useState(() => crypto.randomUUID().slice(0, 8)); // simple session ID for fingerprint fallback

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    const formData = new FormData();
    formData.append("email", email);
    if (name) formData.append("name", name);
    if (interests.length) formData.append("interests", interests.join(","));
    formData.append("deviceId", deviceId);

    try {
      const response = await joinBeta(null, formData);

      if (response.state === "duplicate") {
        setStatus("duplicate");
      } else if (response.state === "review") {
        setStatus("review");
      } else if (response.state === "success") {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      <div className="space-y-2">
        <label htmlFor="name" className="text-xs font-sans font-semibold text-foreground/70 pl-1">
          First name <span className="text-muted/60 font-normal">(Optional)</span>
        </label>
        <input
          type="text"
          id="name"
          autoComplete="given-name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={status === "loading"}
          className="w-full px-5 py-3.5 rounded-full bg-white/10 border border-white/20 text-sm text-foreground focus:outline-none focus:border-white/40 transition-colors placeholder:text-foreground/40 disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-xs font-sans font-semibold text-foreground/70 pl-1">
          Email address <span className="text-red-500">*</span>
        </label>
        <input
          ref={emailInputRef}
          type="email"
          id="email"
          required
          autoComplete="email"
          placeholder="creator@youtube.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="w-full px-5 py-3.5 rounded-full bg-white/10 border border-white/20 text-sm text-foreground focus:outline-none focus:border-white/40 transition-colors placeholder:text-foreground/40 disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-sans font-semibold text-foreground/70 pl-1">
          Languages you stream to <span className="text-muted/60 font-normal">(Select all that apply)</span>
        </label>
        <InterestPillGroup selected={interests} onChange={setInterests} />
      </div>

      <AnimatePresence mode="popLayout">
        {status === "error" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-sans text-red-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>Something went wrong. Please check your connection and try again.</p>
          </motion.div>
        )}
        {status === "duplicate" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-sans text-amber-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>You've already applied. We'll notify you when it's your turn!</p>
          </motion.div>
        )}
        {status === "review" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-sans text-amber-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>Application submitted. Pending review — we'll email you soon.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={status === "loading" || !email}
        className="w-full flex items-center justify-center px-6 py-4 text-base font-medium bg-foreground text-background rounded-full hover:opacity-90 disabled:opacity-60 active:scale-[0.98] disabled:active:scale-100 transition-all duration-200"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {status === "loading" ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          "Apply for Beta Access"
        )}
      </button>

      <p className="text-[11px] text-center text-muted/80 px-4">
        By applying, you agree to our Terms of Service and Privacy Policy. We won't spam you.
      </p>
    </form>
  );
}
```

- [ ] **Step 3: Implement `/beta/page.tsx`**

```tsx
// src/app/beta/page.tsx
"use client";

import { useEffect } from "react";
import { BetaApplicationForm } from "@/app/components/BetaApplicationForm";

export default function BetaPage() {
  useEffect(() => {
    document.body.classList.add("landing-dark-body");
    return () => {
      document.body.classList.remove("landing-dark-body");
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      {/* Navbar - reuse landing navbar */}
      <header className="w-full border-b border-white/10 bg-white/[0.02] backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2" aria-label="Vaani Home">
            <svg className="w-8 h-8 text-white" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
              <path d="M10 16c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-serif text-xl font-medium text-white">Vaani</span>
          </a>
        </div>
      </header>

      {/* Hero + Form */}
      <section className="flex-1 flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-3xl">
          {/* Headline */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-[-2px] leading-[0.95] text-white" style={{ fontFamily: "var(--font-playfair)" }}>
              Apply for <span className="font-serif italic">Beta Access</span>
            </h1>
            <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
              Join streamers translating live to 4+ Indian languages. Limited seats — we review every application.
            </p>
          </div>

          {/* Form Card */}
          <div className="liquid-glass p-6 sm:p-8 md:p-10">
            <BetaApplicationForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-white/[0.02] py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-xs text-white/40">
          © {new Date().getFullYear()} Vaani. Real-time multilingual streaming.
        </div>
      </footer>
    </main>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/app/beta/page.tsx src/app/components/BetaApplicationForm.tsx src/app/components/InterestPillGroup.tsx
git commit -m "feat: add /beta public application page with design system compliance"
```

---

### Task 15: Beta Accepted Page (`/beta/accepted`)

**Files:**
- Create: `src/app/beta/accepted/page.tsx`

**Interfaces:**
- Consumes: `WaitlistModal` success pattern, design system
- Produces: Confirmation page with query params

- [ ] **Step 1: Implement page**

```tsx
// src/app/beta/accepted/page.tsx
"use client";

import { useEffect, useSearchParams } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function BetaAcceptedPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";
  const name = searchParams.get("name") || "there";

  useEffect(() => {
    document.body.classList.add("landing-dark-body");
    return () => {
      document.body.classList.remove("landing-dark-body");
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <svg className="w-8 h-8 text-white" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <path d="M10 16c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-serif text-xl font-medium text-white">Vaani</span>
        </a>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="text-3xl font-normal mb-3 text-white" style={{ fontFamily: "var(--font-playfair)" }}>
          You're on the List!
        </h1>
        <p className="text-white/70 leading-relaxed mb-8">
          Thanks <strong>{name}</strong>. We'll email <strong>{email}</strong> when your beta seat opens up.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-medium text-foreground bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-all duration-200"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Back to Home
        </Link>
      </motion.div>

      <footer className="w-full border-t border-white/10 bg-white/[0.02] py-8 px-4 mt-auto">
        <div className="max-w-7xl mx-auto text-center text-xs text-white/40">
          © {new Date().getFullYear()} Vaani. Real-time multilingual streaming.
        </div>
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/beta/accepted/page.tsx
git commit -m "feat: add /beta/accepted confirmation page"
```

---

### Task 16: Beta Pending Page (`/beta/pending`)

**Files:**
- Create: `src/app/beta/pending/page.tsx`

**Interfaces:**
- Consumes: design system (landing theme)
- Produces: Page shown when signed-in user lacks membership

- [ ] **Step 1: Implement page**

```tsx
// src/app/beta/pending/page.tsx
"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function BetaPendingPage() {
  useEffect(() => {
    document.body.classList.add("landing-dark-body");
    return () => {
      document.body.classList.remove("landing-dark-body");
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <svg className="w-8 h-8 text-white" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <path d="M10 16c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-serif text-xl font-medium text-white">Vaani</span>
        </a>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center">
          <Clock size={40} />
        </div>
        <h1 className="text-3xl font-normal mb-3 text-white" style={{ fontFamily: "var(--font-playfair)" }}>
          Beta Access Pending
        </h1>
        <p className="text-white/70 leading-relaxed mb-6">
          You're signed in, but your beta application hasn't been approved yet.
        </p>
        <p className="text-white/50 text-sm mb-8">
          We review applications manually. You'll receive an email when your seat is ready.
        </p>
        <div className="space-y-3">
          <Link
            href="/beta"
            className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-medium text-foreground bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-all duration-200 w-full"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Check Application Status
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-medium text-white/70 hover:text-white transition-colors w-full"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Back to Home
          </Link>
        </div>
      </motion.div>

      <footer className="w-full border-t border-white/10 bg-white/[0.02] py-8 px-4 mt-auto">
        <div className="max-w-7xl mx-auto text-center text-xs text-white/40">
          © {new Date().getFullYear()} Vaani. Real-time multilingual streaming.
        </div>
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/beta/pending/page.tsx
git commit -m "feat: add /beta/pending page for signed-in users without membership"
```

---

### Task 17: Admin Beta Review Page (`/admin/beta`)

**Files:**
- Create: `src/app/(dashboard)/admin/beta/page.tsx`
- Create: `src/app/components/admin/BetaApplicationsTable.tsx`
- Create: `src/app/components/admin/BetaApplicationRow.tsx`
- Create: `src/app/components/admin/AdminToolbar.tsx`

**Interfaces:**
- Consumes: `DashboardShell`, `GlassCard`, status badge pattern, admin API, design system
- Produces: Dark dashboard-theme review queue

- [ ] **Step 1: Implement `AdminToolbar.tsx`**

```tsx
// src/app/components/admin/AdminToolbar.tsx
"use client";

import { useState, FormEvent } from "react";
import { Search, Download, Filter } from "lucide-react";

interface AdminToolbarProps {
  status: string;
  onStatusChange: (status: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onExport: () => void;
}

export function AdminToolbar({ status, onStatusChange, search, onSearchChange, onExport }: AdminToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  return (
    <div className="liquid-glass border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <form onSubmit={handleSubmit} className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
        <input
          type="search"
          placeholder="Search email, name..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-sm text-white outline-none focus:border-white/30 placeholder:text-neutral-600"
        />
      </form>

      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="liquid-glass border border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-white outline-none focus:border-white/30 bg-white/[0.02] appearance-none"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="review">Review</option>
        </select>

        <button
          onClick={onExport}
          className="liquid-glass border border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-neutral-400 hover:text-white hover:border-white/25 transition-colors flex items-center gap-1.5"
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `BetaApplicationRow.tsx`**

```tsx
// src/app/components/admin/BetaApplicationRow.tsx
"use client";

import { motion } from "framer-motion";
import { Check, X, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BetaApplicationRowProps {
  application: {
    _id: string;
    email: string;
    name?: string;
    interests: string[];
    status: "pending" | "approved" | "rejected" | "review";
    reviewReason?: string;
    deviceHash?: string;
    ipAddress: string;
    createdAt: string;
    reviewedAt?: string;
  };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing?: boolean;
}

const STATUS_STYLES = {
  pending: "border border-amber-500/40 text-amber-400 bg-transparent",
  approved: "border border-[#2DD4BF]/40 text-[#2DD4BF] bg-transparent",
  rejected: "border border-red-500/40 text-red-400 bg-transparent",
  review: "border border-blue-500/40 text-blue-400 bg-transparent",
};

const LANGUAGE_LABELS: Record<string, { flag: string; name: string }> = {
  hi: { flag: "🇮🇳", name: "Hindi" },
  ta: { flag: "🇮🇳", name: "Tamil" },
  te: { flag: "🇮🇳", name: "Telugu" },
  kn: { flag: "🇮🇳", name: "Kannada" },
  mr: { flag: "🇮🇳", name: "Marathi" },
  bn: { flag: "🇮🇳", name: "Bengali" },
  gu: { flag: "🇮🇳", name: "Gujarati" },
  ml: { flag: "🇮🇳", name: "Malayalam" },
};

export function BetaApplicationRow({ application, onApprove, onReject, isProcessing }: BetaApplicationRowProps) {
  const statusStyle = STATUS_STYLES[application.status];
  const interests = application.interests.map((id) => LANGUAGE_LABELS[id]?.name || id).join(", ");

  const handleApprove = () => !isProcessing && onApprove(application._id);
  const handleReject = () => !isProcessing && onReject(application._id);

  // Desktop table row
  const desktopRow = (
    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
      <td className="px-4 py-3 font-mono text-xs text-neutral-400">{application._id.slice(-6)}</td>
      <td className="px-4 py-3">
        <div className="font-sans text-sm text-white">{application.name || "—"}</div>
        <div className="font-mono text-xs text-neutral-400 truncate max-w-xs">{application.email}</div>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-neutral-300 max-w-xs truncate">{interests || "—"}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-sans font-medium px-2.5 py-1 rounded-full ${statusStyle}`}>
          {application.status.toUpperCase()}
        </span>
        {application.reviewReason && (
          <span className="ml-2 text-[10px] text-neutral-500 font-sans">({application.reviewReason})</span>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-neutral-500 hidden md:table-cell">
        {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {application.status === "pending" || application.status === "review" ? (
            <>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
              >
                <Check size={12} strokeWidth={2} />
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
              >
                <X size={12} strokeWidth={2} />
                Reject
              </button>
            </>
          ) : application.status === "approved" ? (
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
            >
              <X size={12} strokeWidth={2} />
              Revoke
            </button>
          ) : (
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
            >
              <Check size={12} strokeWidth={2} />
              Restore
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  // Mobile card
  const mobileCard = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="liquid-glass border border-white/10 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-sans text-sm font-medium text-white">{application.name || "Unnamed"}</div>
          <div className="font-mono text-xs text-neutral-400">{application.email}</div>
        </div>
        <span className={`text-xs font-sans font-medium px-2.5 py-1 rounded-full ${statusStyle}`}>
          {application.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2 text-neutral-400">
          <span className="font-sans font-medium">Interests:</span>
          <span className="font-mono">{interests || "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-500">
          <span className="font-sans font-medium">Applied:</span>
          <span className="font-mono">{formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}</span>
        </div>
        {application.deviceHash && (
          <div className="flex items-center gap-2 text-neutral-500">
            <span className="font-sans font-medium">Device:</span>
            <span className="font-mono">{application.deviceHash.slice(0, 12)}...</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-neutral-500">
          <span className="font-sans font-medium">IP:</span>
          <span className="font-mono">{application.ipAddress}</span>
        </div>
        {application.reviewReason && (
          <div className="flex items-center gap-2 text-blue-400">
            <AlertTriangle size={12} />
            <span className="font-sans">Review: {application.reviewReason}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        {application.status === "pending" || application.status === "review" ? (
          <>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 px-3 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Check size={12} strokeWidth={2} />
              Approve
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 px-3 py-2 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <X size={12} strokeWidth={2} />
              Reject
            </button>
          </>
        ) : application.status === "approved" ? (
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 px-3 py-2 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <X size={12} strokeWidth={2} />
            Revoke
          </button>
        ) : (
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 px-3 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <Check size={12} strokeWidth={2} />
            Restore
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      {desktopRow}
      {mobileCard}
    </>
  );
}
```

- [ ] **Step 3: Implement `BetaApplicationsTable.tsx`**

```tsx
// src/app/components/admin/BetaApplicationsTable.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Database, Inbox } from "lucide-react";
import { BetaApplicationRow } from "./BetaApplicationRow";
import { AdminToolbar } from "./AdminToolbar";

interface BetaApplicationsTableProps {}

export function BetaApplicationsTable() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status,
        search,
        page: String(page),
        limit: "20",
      });
      const res = await fetch(`/api/admin/beta-applications?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setApplications(data.applications || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [status, search, page]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/beta-applications/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to approve");
      fetchApplications();
    } catch {
      alert("Failed to approve application");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/beta-applications/${id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reject");
      fetchApplications();
    } catch {
      alert("Failed to reject application");
    } finally {
      setProcessingId(null);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ status, search });
      const res = await fetch(`/api/admin/beta-applications/export?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `beta-applications-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  if (loading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center gap-3 py-16">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
        <p className="text-sm font-sans text-neutral-400">Loading applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="liquid-glass border border-red-500/30 rounded-xl p-6 text-center text-red-400">
        <Database size={32} className="mx-auto mb-3 text-red-500" />
        <p className="font-sans">{error}</p>
        <button onClick={fetchApplications} className="mt-3 px-4 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200">
          Retry
        </button>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="liquid-glass border border-white/10 rounded-xl p-12 text-center">
        <Inbox size={48} className="mx-auto mb-4 text-neutral-500" />
        <p className="font-sans text-neutral-400">No applications found</p>
        <p className="text-xs text-neutral-500 mt-1">Adjust filters or wait for new signups</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminToolbar
        status={status}
        onStatusChange={(s) => { setStatus(s); setPage(1); }}
        search={search}
        onSearchChange={(s) => { setSearch(s); setPage(1); }}
        onExport={handleExport}
      />

      <div className="liquid-glass border border-white/10 rounded-xl overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wider text-neutral-500">ID</th>
                <th className="px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wider text-neutral-500">Applicant</th>
                <th className="px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wider text-neutral-500">Interests</th>
                <th className="px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wider text-neutral-500 hidden md:table-cell">Applied</th>
                <th className="px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wider text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, idx) => (
                <BetaApplicationRow
                  key={app._id}
                  application={app}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isProcessing={processingId === app._id}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3 p-4">
          {applications.map((app) => (
            <BetaApplicationRow
              key={app._id}
              application={app}
              onApprove={handleApprove}
              onReject={handleReject}
              isProcessing={processingId === app._id}
            />
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="liquid-glass border border-white/10 rounded-full px-4 py-2 text-xs font-sans text-neutral-400 hover:text-white hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm font-sans text-neutral-400 px-4">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="liquid-glass border border-white/10 rounded-full px-4 py-2 text-xs font-sans text-neutral-400 hover:text-white hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement `/admin/beta/page.tsx`**

```tsx
// src/app/(dashboard)/admin/beta/page.tsx
import { BetaApplicationsTable } from "@/app/components/admin/BetaApplicationsTable";

export default function AdminBetaPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight leading-none">
          Beta <span className="font-serif italic font-normal">Applications</span>
        </h1>
        <p className="text-sm font-sans text-neutral-400 mt-2">
          Review and approve beta waitlist signups.
        </p>
      </div>

      <BetaApplicationsTable />
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors (add `date-fns` to deps if needed)

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/admin/beta/page.tsx src/app/components/admin/BetaApplicationsTable.tsx src/app/components/admin/BetaApplicationRow.tsx src/app/components/admin/AdminToolbar.tsx
git commit -m "feat: add /admin/beta review queue with design system compliance"
```

---

### Task 18: Deprecate Waitlist Action (Optional Cleanup)

**Files:**
- Modify: `src/app/actions/join-waitlist.ts` — add deprecation comment, keep for existing entries
- Modify: `src/app/components/WaitlistModal.tsx` — update to use `/beta` link instead of inline form (optional)

- [ ] **Step 1: Add deprecation notice to `join-waitlist.ts`**

```typescript
// src/app/actions/join-waitlist.ts (top of file)
/**
 * @deprecated Replaced by join-beta action in join-beta.ts.
 * Kept for existing waitlist entries migration. New flow: /beta page → joinBeta action.
 */
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/join-waitlist.ts
git commit -m "chore: deprecate join-waitlist action (replaced by join-beta)"
```

---

### Task 19: Full Integration Test & Build

**Files:**
- Run: `npm run build`
- Run: `npx vitest run`

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit any remaining changes**

```bash
git add .
git commit -m "chore: final integration build pass"
```

---

## Verification Checklist

Before considering this plan complete, verify:

- [ ] **Anti-abuse layers all implemented:**
  - [ ] Email normalization (strip +tag, strip Gmail dots) for duplicate detection
  - [ ] Disposable email blocklist via `disposable-email-domains`
  - [ ] Test/role email rejection
  - [ ] Device fingerprint SHA-256 hash stored (never raw fingerprint)
  - [ ] Per-IP rate limits: 3/hour, 5/day
  - [ ] Device/IP cardinality flagging at >3 applications
  - [ ] Human review queue for flagged applications

- [ ] **Clerk integration correct:**
  - [ ] `proxy.ts` thin middleware (no deprecated matcher)
  - [ ] Dashboard layout uses `requireMembershipForLayout()`
  - [ ] All 10 API routes use `requireMembership()`
  - [ ] `/api/beta/claim` binds `clerkUserId` on first sign-in
  - [ ] Sparse unique index on `clerkUserId` prevents double-claim
  - [ ] Conflict flagging on second Clerk account with same email

- [ ] **Design system compliance:**
  - [ ] `/beta` uses landing theme (`.liquid-glass`, Playfair headings, saffron primary)
  - [ ] `/beta/accepted` and `/beta/pending` match landing theme
  - [ ] `/admin/beta` uses dashboard theme (dark glass, teal active, `font-serif italic` accent)
  - [ ] All forms reuse existing input/button patterns exactly
  - [ ] Status badges match Channels page pattern
  - [ ] Table/mobile cards match Channels responsive pattern

- [ ] **Tests pass:**
  - [ ] Unit tests for email-policy, device-fingerprint, beta-membership
  - [ ] Integration tests for join-beta action, claim route
  - [ ] Type-check clean
  - [ ] Build succeeds

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-13-beta-access-bulletproof.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review

**Which approach?**