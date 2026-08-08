# Fix 404 design + Onboarding persistence + Auth route guards

## Context

The user reported three related problems:

1. **404 page is off-brand** — still uses the old dashboard light theme
   (`glass-card`, `font-syne`, `#F5821F`, beige `#F5F2ED`) instead of the
   landing design system.
2. **Onboarding "does nothing"** — after completing onboarding and signing back
   in, the dashboard is a blank slate (key not connected, channels not
   configured); in a fresh browser the wizard re-opens "as if onboarding never
   happened".
3. **Route access rules** — once signed in and onboarded the user must not be
   able to reach onboarding again; signed-in users must not see sign-in/sign-up.

Three parallel research lanes root-caused the onboarding bug to **three stacked,
certain failures** in `OnboardingWizard.tsx`:

- **H1 (405):** wizard `POST`s to `/api/key`, but that route exports only
  `DELETE` → 405. The Sarvam key is **never saved**. The working first-time
  endpoint is `/api/key/validate` (also creates the User doc).
- **H2 (403 + field mismatch):** wizard `POST`s `/api/channels` with no
  `x-csrf-token` → 403 `CSRF_FAILED`; and sends `streamKey` while the API reads
  `rtmpKey`, so the stream key would be dropped even with CSRF.
- **H3 (localStorage-only):** "onboarding done" lives only in
  `localStorage["vaani_onboarding_done"]`. The server-side
  `User.onboardingComplete` field is **dead code** (never written or read), so
  the server has no notion of onboarding. Same-browser re-login → blank slate;
  fresh browser → wizard reopens.

Adjacent issues found in the same audit:

- The **Channels page** itself sends no `x-csrf-token` on save/toggle/delete →
  403 after CSRF hardening, so users can't fix channel state from the tab.
- **Sign-in/sign-up pages** don't redirect already-signed-in users away.
- **`sso-callback`** uses a bare `<AuthenticateWithRedirectCallback />` with no
  redirect target → Google OAuth may land on `/` instead of `/dashboard`.
- `src/proxy.ts` is dead "middleware" — the filename is never auto-loaded by
  Next; all real protection lives in the `(dashboard)` layout + per-route API
  checks.

## Decisions

- **Onboarding stays a modal** inside the protected dashboard. There is no
  `/onboarding` route and we are not adding one — every stated requirement is
  satisfiable without it: anonymous users already can't reach the dashboard
  (layout redirects), and "no re-access after done" = the wizard won't auto-open
  once the server signal exists. Adding a route would duplicate the wizard.
- `error.tsx` (dashboard) still uses legacy styling — out of scope, flag only.

## Changes

### 1. Rebuild 404 — `src/app/not-found.tsx` (rewrite)
Make it a client component on the canonical content-page recipe:
`ContentPageShell` (dark theme via `landing-dark-body`, `grain`, auth-aware
landing Navbar + Footer) → inner `mx-auto max-w-xl` header: eyebrow `404`,
serif Playfair H1, muted lead, primary inverted pill CTA `Back to Home` → `/`.
Uses `fadeUp(0)` via framer-motion.

### 2. Fix the onboarding wizard — `src/app/components/OnboardingWizard.tsx`
- Add `useCSRF` (from `@/lib/use-csrf`, same as `OnboardingModal`).
- **Step1:** `POST /api/key/validate` with `{ key }` + `x-csrf-token` header
  (replaces the broken `POST /api/key`).
- **Step2:** `POST /api/channels` with `{ languageId: "hi", rtmpUrl,
  rtmpKey: streamKey, enabled: true }` + `x-csrf-token` (rename `streamKey` →
  `rtmpKey`, drop the ignored `name`).
- **Auto-open gate:** replace the key+channels check with a single
  `/api/key/status` read — open only when `connected` is false **and**
  `onboardingComplete` is false (removes the dead `needsChannel` check, which
  always evaluated false because the API returns all 7 languages).

### 3. Server-side onboarding signal
- `src/app/api/key/validate/route.ts`: add `onboardingComplete: true` to the
  User upsert (first-time save = onboarding complete).
- `src/app/api/key/status/route.ts`: project `onboardingComplete` and return it
  in both branches (`{ connected: false, onboardingComplete }` and
  `{ connected: true, onboardingComplete: true, ... }`).

### 4. Fix Channels page CSRF — `src/app/(dashboard)/channels/page.tsx`
Add `useCSRF`; include `x-csrf-token` on the save `POST`, the toggle `POST`,
and the `DELETE`.

### 5. Signed-in users redirected away from auth pages
- `sign-in` and `sign-up` pages (`(auth)/sign-in/[[...sign-in]]/page.tsx`,
  `(auth)/sign-up/[[...sign-up]]/page.tsx`): destructure `isSignedIn` from
  `useAuth`; when `isLoaded && isSignedIn`, `router.replace("/dashboard")` and
  render nothing. (Added to the pages, not the shared `(auth)/layout.tsx`,
  because the layout also wraps `sso-callback`, which must stay reachable
  mid-OAuth.)
- `(auth)/sso-callback/page.tsx`: pass `afterSignInUrl="/dashboard"` and
  `afterSignUpUrl="/dashboard"` to `<AuthenticateWithRedirectCallback />`.

### 6. Delete dead middleware — `src/proxy.ts`
Never executed (wrong filename), and protection already lives in the layout +
API routes. Remove the file.

## Files touched
| File | Change |
|---|---|
| `src/app/not-found.tsx` | rewrite (design-system 404) |
| `src/app/components/OnboardingWizard.tsx` | fix API calls + CSRF + auto-open gate |
| `src/app/api/key/validate/route.ts` | set `onboardingComplete: true` |
| `src/app/api/key/status/route.ts` | return `onboardingComplete` |
| `src/app/(dashboard)/channels/page.tsx` | CSRF headers on save/toggle/delete |
| `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | signed-in redirect |
| `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | signed-in redirect |
| `src/app/(auth)/sso-callback/page.tsx` | redirect targets |
| `src/proxy.ts` | delete |

## Verification
- `npx tsc --noEmit`, `npx eslint` on changed files, `npm run build`, `npm test`.
- Manual auth matrix (needs Clerk dev instance):
  1. Anonymous `/dashboard` → redirected to `/sign-in` (unchanged, confirm).
  2. Signed-in visiting `/sign-in` or `/sign-up` → bounced to `/dashboard`.
  3. Fresh user on dashboard, no key → wizard opens at step1; saving a key
     advances to step2; channel save advances to step3.
  4. Sign out → sign in (same browser) → wizard does **not** open (server flag);
     repeat in a fresh/incognito browser → still no wizard.
  5. `/nonexistent` → dark landing-themed 404 with Navbar/Footer.
  6. Channels tab save/toggle/delete now succeed (no 403).
