/**
 * Per-email waitlist join policy.
 *
 * Rules:
 *  - No prior entry           -> allow (first join)
 *  - emailSent (or legacy)    -> duplicate: never re-send to an email already on the list
 *  - Not sent, attempts left  -> allow retry (resend)
 *  - Attempt cap exceeded     -> blocked
 */
export const MAX_WAITLIST_ATTEMPTS = 3;

export type WaitlistEntryState = {
  emailSent: boolean | undefined;
  attemptCount: number | undefined;
};

export type JoinDecision =
  | { state: "success" }
  | { state: "duplicate" }
  | { state: "blocked" };

export function decideJoin(entry: WaitlistEntryState | null): JoinDecision {
  if (!entry) return { state: "success" };

  // Legacy entries (created before the sent/count fields) were joined the
  // old way — treat as already on the list rather than re-send.
  if (entry.emailSent === undefined) return { state: "duplicate" };
  if (entry.emailSent) return { state: "duplicate" };

  const attempts = entry.attemptCount ?? 0;
  if (attempts >= MAX_WAITLIST_ATTEMPTS) return { state: "blocked" };

  return { state: "success" };
}
