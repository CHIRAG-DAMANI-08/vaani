# Plan — Privacy, Terms & Contact pages (design-system consistent)

## Context

The site links to `/privacy`, `/terms` and `/contact` in three places but none of those routes exist — they 404:

- **Landing footer** (`src/components/landing/Footer.jsx`): `Privacy`, `Terms`, `Contact` all `href="#"`.
- **Auth layout** (`src/app/(auth)/layout.tsx` lines 47–58): links to `/privacy` and `/terms`.
- **WaitlistModal** (line ~210): "Terms of Service and Privacy Policy" legal links.

The user needs credible legal pages + a working contact page, **following the landing design system** (dark `landing-dark-body`, liquid-glass, Playfair/Inter), consistent with the rest of the site. They can't afford a lawyer, so the legal text must be as thorough and *accurate to Vaani's actual data practices* as possible — inaccuracy is the one thing that makes boilerplate dangerous.

**Honesty constraint (not negotiable):** I am not a lawyer; a self-drafted policy is not "bulletproof" in the legal sense. I will produce a comprehensive draft grounded in (a) a verified inventory of Vaani's real data flows and (b) settled law (GDPR, CCPA/CPRA, CalOPPA, COPPA, DMCA), and I'll say plainly that a one-time human review is still recommended. No "this is not legal advice" disclaimers go *inside* the public pages.

**User decisions:** No legal entity yet → docs reference operating name **"Vaani"** + placeholder address, governing law **India** (matches INR cost model), with `// TODO: update when registered` markers. Contact email → user's own inbox, supplied at implementation (single `CONTACT_EMAIL` constant).

## Verified data-practice inventory (source of truth for the legal text)

From codebase exploration — these are the facts the policies must accurately describe:

- **Identity:** Clerk auth only (email/password + Google OAuth). App stores only the Clerk user id (`clerkId`); no names/emails for authenticated users.
- **Secrets at rest:** Sarvam API key, OBS WebSocket password, RTMP stream keys — AES-256-GCM encrypted in MongoDB (`ENCRYPTION_KEY`).
- **Persisted data:** `sessions` store the **full STT transcript of the streamer's speech per session** (translations are *not* stored; TTS audio is *not* stored; raw speech audio is buffered in memory per 3s chunk only). `waitlist_entries` store **email + optional name** (+ campaign/referrer). `channels` store destination URL + encrypted stream key per language.
- **Retention:** No TTL / no expiry / **no account-deletion or data-erasure endpoint exists**. Transcripts persist indefinitely, viewable (last 20) and exportable (`/api/sessions/export`).
- **No payments, no analytics SDK, no tracking scripts.** No Stripe; invite/waitlist-based access.
- **Third parties receiving data:** Sarvam AI (speech audio + recognized text for STT/translate/TTS), Clerk (identity), MongoDB Atlas (all persistence), Resend (waitlist email), YouTube/Twitch (user's own channels — the app pushes translated audio to *their* RTMP endpoints), Google Fonts (IP). OBS WebSocket is browser→local only. Node Media Server / FFmpeg run locally.
- **Cookies:** Clerk session + `__vaani_csrf` (HttpOnly, Secure in prod, SameSite=strict) — essential-only, no advertising/analytics cookies.
- **localStorage:** non-sensitive prefs (`vaani_tts_speaker`, `vaani_tts_pace`, `vaani_source_lang`, `vaani_onboarding_done`).
- **Logging:** pino to stdout; secrets redacted (`[redacted]`); no log-shipping service.
- **Streaming model:** OBS → local RTMP (`rtmp://localhost:1935/live/<clerkId>`), server extracts audio → STT/translate/TTS → FFmpeg re-muxes the **user's own video** + translated audio → pushed to the **user's own** YouTube/Twitch endpoints. Vaani never stores video/audio; it relays to the user's configured destinations.

## Architecture

Three new top-level routes, all on the landing design system, sharing a **content-page shell** so the three pages don't duplicate chrome.

**Shared shell** — `src/app/components/ContentPageShell.tsx` (client, `"use client"`):
- On mount adds `document.body.classList.add("landing-dark-body")` (same pattern as `src/app/page.tsx`) and removes on cleanup.
- Renders `<Navbar />` (landing) + content + `<Footer />` (landing).
- Content container: `max-w-3xl mx-auto px-6 md:px-8 py-24` — readable measure (~65–75ch), no horizontal scroll, mobile-first padding.
- Typography (design tokens, not raw hex): `text-foreground` headings in `font-serif` (Playfair via `--font-playfair`), body `text-muted-foreground`/`text-secondary` in `font-sans`, `leading-relaxed`, base 16px.
- `fadeUp` reveal from `@/lib/motion` (already used across the site); respects the global `prefers-reduced-motion` kill-switch in globals.css.

**Legal renderer** — content as data, presentation shared:
- `src/lib/legal/content.tsx` — a `LegalDocument` component + `LegalSection` type (`{ id, heading, body: (string | { list: string[] })[] }`). Renders an anchored TOC (sticky on desktop, inline on mobile) + sections. No new dependencies.
- `src/lib/legal/privacy.ts` and `src/lib/legal/terms.ts` — the actual policy text as plain data (easy for a human/lawyer to read and edit later).

**Pages** (thin):
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` — `<ContentPageShell><LegalDocument ... /></ContentPageShell>`.
- `src/app/contact/page.tsx` — shell + contact form.

## Files

**New**
| File | Purpose |
|---|---|
| `src/app/components/ContentPageShell.tsx` | Shared dark shell: Navbar + content + Footer |
| `src/lib/legal/content.tsx` | `LegalDocument` renderer + TOC |
| `src/lib/legal/privacy.ts` | Privacy policy content data |
| `src/lib/legal/terms.ts` | Terms of Service content data |
| `src/app/privacy/page.tsx` | Route |
| `src/app/terms/page.tsx` | Route |
| `src/app/contact/page.tsx` | Route + form |
| `src/app/actions/send-contact.ts` | Server action: validate + rate-limit + Resend to `CONTACT_EMAIL` |

**Modified**
| File | Change |
|---|---|
| `src/components/landing/Footer.jsx` | `href` map: Privacy→`/privacy`, Terms→`/terms`, Contact→`/contact` (keep `data-testid`s) |
| `src/components/landing/Navbar.jsx` | Anchor links resolve to `/#home` etc. when `pathname !== "/"` (via `usePathname`) so nav works on non-landing pages |
| `src/app/components/WaitlistModal.tsx` | Point the "Terms of Service and Privacy Policy" line at `/terms`, `/privacy` |
| `src/app/(auth)/layout.tsx` | Verify `/privacy`, `/terms` links now resolve (no code change expected) |

## Privacy Policy content (grounded in inventory)

Sections (each with `id` for TOC anchors):
1. **Introduction / who we are** — "Vaani" operating name, data controller, placeholder registered-address block + `TODO` marker; last-updated date.
2. **Information we collect** — *Account & identity* (Clerk id; no names/emails for logged-in users); *Service data* (stream session transcripts, active languages, usage/cost stats); *Waitlist* (email + optional name + campaign/referrer); *Preferences* (TTS voice/pace/source-language in browser localStorage); *Secrets you provide* (Sarvam key, OBS credentials, RTMP stream keys — encrypted at rest).
3. **How we use information** — lawful bases (contract/service delivery, legitimate interest, consent for waitlist email); enumerated purposes.
4. **How we share information** — third-party processors table with named recipients (Sarvam AI, Clerk, MongoDB Atlas, Resend, YouTube/Twitch as user-configured destinations, Google Fonts) + what each receives. Explicit: **we do not sell or share personal information** (no CCPA sale), no ad networks, no analytics.
5. **Content you stream** — video/audio never stored by Vaani; relayed to the user's own RTMP endpoints; **transcripts of your speech are stored** and exportable; retention statement.
6. **Cookies & local storage** — essential-only (Clerk session, `__vaani_csrf`), no tracking/advertising cookies.
7. **Security** — AES-256-GCM encryption at rest for secrets, HTTPS, redacted logging, RTMP publish guarded by authenticated session.
8. **Data retention** — current reality stated honestly (transcripts persist until deleted; no auto-expiry), plus commitment to add user deletion tooling.
9. **Your rights** — GDPR (access, rectification, erasure, restriction, portability, objection), CCPA/CPRA (know, delete, correct, no-sale, non-discrimination), CalOPPA/Shine-the-Light; how to exercise them (email → `CONTACT_EMAIL`); response-time commitment.
10. **International transfers** — Sarvam/MongoDB/Resend processing; SCCs/adequacy framing.
11. **Children's privacy** — not directed at under-13 (COPPA); no knowledge-based collection.
12. **Changes to this policy** — notice via in-app + updated "last updated" date.
13. **Contact** — privacy requests to `CONTACT_EMAIL`.

## Terms of Service content

1. **Acceptance** — binding agreement, by using you accept.
2. **The service** — describe accurately: real-time speech-to-speech translation of your live broadcasts to your own YouTube/Twitch channels via your own API key; invite/waitlist-based access.
3. **Accounts & credentials** — Clerk account; you're responsible for the security of your account, your Sarvam API key, OBS credentials and stream keys; don't share.
4. **Your content & license** — you own/represent rights to everything you broadcast; you grant Vaani the limited license to process/transmit/translate your content to provide the service (to Sarvam AI + your destinations); **you must have the rights to stream it (copyright)**.
5. **Acceptable use / prohibited conduct** — no unlawful, infringing, harmful, hateful content; no impersonation; no interference with the service; enforcement (suspend/terminate).
6. **Third-party services** — Sarvam AI, YouTube/Twitch, OBS governed by their terms; Vaani not liable for third-party outages/policy changes; **your own API keys may incur costs billed by the provider, not Vaani**.
7. **Fees** — currently none (invite-based); reservation to charge in future with notice.
8. **DMCA / copyright** — designated agent contact (`CONTACT_EMAIL`), takedown process for material hosted on the service.
9. **Intellectual property** — Vaani's marks/software vs. your content.
10. **Disclaimers** — service "as is" / "as available"; no warranty of uninterrupted translation/streaming.
11. **Limitation of liability** — exclusion of consequential damages; cap tied to what you paid (currently free → stated cap).
12. **Indemnification** — you indemnify Vaani for claims arising from your content/use.
13. **Termination** — we may suspend/terminate for breach; your data handling on termination.
14. **Changes to terms** — notice + continued use = acceptance.
15. **Governing law & disputes** — **India** (placeholder, `TODO`), courts at registered place, note to update when entity exists.

## Contact page

- Design-system form (matches WaitlistModal restyle: `liquid-glass` card, `glass-input`-style fields, `bg-foreground text-background` primary button, loading/success/error states via framer + icons).
- Fields: name (optional), email (required), topic (subject line), message (required, min length). Labels above inputs (`input-labels`), `autoComplete`, visible required markers.
- **Action** `src/app/actions/send-contact.ts`: zod validation → reuse `rateLimit()` from `@/lib/rate-limit` (spam guard, e.g. 5/min per email + per-IP-ish key) → `resend.emails.send` to `CONTACT_EMAIL` with a reply-to of the sender → success/error response. No DB store (messages go straight to inbox).
- Below form: direct `mailto:` link + response-time expectation ("we reply within X business days").
- Small note pointing privacy/legal requests at `CONTACT_EMAIL` per the policies.

## Design-system consistency ("make the other pages follow it too")

- New pages use the **landing** dark system (the chrome they're linked from) — `landing-dark-body`, liquid-glass, Playfair headings, Inter body, `fadeUp`, global reduced-motion.
- **Nav consistency:** landing Navbar anchors must work off the landing page → `usePathname` fix in `Navbar.jsx`.
- **Footer** is the single cross-site footer; wiring its links once fixes every page that uses it.
- Verify no theme leakage: dark body class added/removed per-page exactly like `src/app/page.tsx`; dashboard (own dark shell) and auth (intentionally light) are untouched.
- No raw hex in components — use tokens (`text-foreground`, `text-muted-foreground`, `bg-background`, `liquid-glass`).

## Verification

1. `npx next build` — all 3 routes compile and prerender static.
2. `npx tsc --noEmit` clean; `npx eslint` on new/changed files (only pre-existing warnings).
3. `npx vitest run` — existing 20 tests stay green (contact action gets a small unit test for the validation/rate-limit boundary if cheap, mirroring `waitlist-policy.test.ts`).
4. **Manual (dev server):**
   - Landing footer → Privacy/Terms/Contact navigate to the new routes; styled dark, readable, no horizontal scroll at 375px and desktop.
   - Navbar anchors on `/privacy` return to landing sections (`/#how-it-works`), and the landing page itself is unchanged.
   - Auth `/sign-in` footer links resolve.
   - WaitlistModal legal links resolve.
   - Contact form: submit → network POST (`$ACTION_...`) → email lands in `CONTACT_EMAIL`; invalid email shows inline error; rapid repeat submits are rate-limited.
   - Confirm the contact email value is the user's actual inbox (supplied at approval).

## Open items before implementation

- **Contact email value** — the actual inbox for the form + legal notices (DMCA, privacy requests). I'll use a single `CONTACT_EMAIL` constant; user supplies the real address.
- Governing-law placeholder confirmed as **India** (can change later when an entity is registered).
