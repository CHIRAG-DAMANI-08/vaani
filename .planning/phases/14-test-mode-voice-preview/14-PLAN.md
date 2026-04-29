---
phase: 14
title: "Test Mode & Voice Preview"
goal: "Let users test the full Sarvam pipeline (text → TTS) without going live in OBS, and choose TTS speaker/pace per language."
status: planned
requirements: []
---

# Phase 14: Test Mode & Voice Preview

## Objective

Right now the only way to validate the TTS pipeline is to go live in OBS and speak into the mic. This is slow, disruptive, and impossible to do quietly.

Phase 14 adds a **Test Mode panel** to the dashboard that lets users:
1. Type any text (or pick a preset phrase) and immediately hear the Sarvam TTS voice for each configured language.
2. Choose the TTS speaker (voice) per language — Sarvam's bulbul:v3 supports multiple speakers.
3. Adjust TTS pace (speed) with a live slider.
4. Lock the source language so bilingual streamers don't confuse the auto-detect STT.

All of this works **without OBS**, with no live stream required.

---

## Plan 14-01: Test Pipeline API Endpoint

**Wave:** 1  
**Autonomous:** true  
**Files modified:**
- `src/app/api/test-pipeline/route.ts` (CREATE)

### Tasks

#### Task 1: Create `/api/test-pipeline` POST route
Create a new Next.js App Router route at `src/app/api/test-pipeline/route.ts`.

The route must:
- Authenticate the request via Clerk using `auth()` from `@clerk/nextjs/server`.
- Accept a JSON body: `{ text: string, targetLanguages: string[], speaker?: string, pace?: number }`.
- Fetch the user's decrypted Sarvam API key from MongoDB (same pattern as other API routes — `User.findOne({ clerkId: userId })`).
- Validate: `text` must be non-empty and max 500 chars. `targetLanguages` must be a non-empty array. `speaker` defaults to `"shubh"`. `pace` defaults to `1.0`, clamped to `0.5–2.0`.
- For each language in `targetLanguages`:
  - Translate `text` from `"en-IN"` (hardcoded source for test mode — user is always typing in English in the test panel) to the target language using `translateText()` from `src/lib/sarvam-pipeline.ts`.
  - Run `textToSpeech()` with the speaker and pace from the request.
- Return JSON: `{ results: [{ languageId, translatedText, audioBase64 }], timings: { translate, tts, total } }`.
- On error: return `{ error: string }` with appropriate HTTP status.

Use existing imports pattern from other routes. Import `connectToDatabase`, `User`, `decryptValue` from the existing utils. Import `translateText`, `textToSpeech`, `LANG_MAP` (export it from sarvam-pipeline.ts if not already exported — add `export` to the const) from `src/lib/sarvam-pipeline.ts`.

**Important:** Export `LANG_MAP` from `src/lib/sarvam-pipeline.ts` by adding `export` keyword to it so the API route can use it for validation.

---

## Plan 14-02: TTS Voice Settings (Speaker & Pace)

**Wave:** 1  
**Autonomous:** true  
**Files modified:**
- `src/app/(dashboard)/settings/TTSSettingsSection.tsx` (CREATE)
- `src/app/(dashboard)/settings/page.tsx` (MODIFY — add TTSSettingsSection to the bento grid)

### Tasks

#### Task 1: Create TTSSettingsSection component

Create `src/app/(dashboard)/settings/TTSSettingsSection.tsx`.

This is a settings card that matches the existing glassmorphic settings style (`bg-white/80 backdrop-blur-xl border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-[24px]`).

State managed via `localStorage` (keys: `vaani_tts_speaker`, `vaani_tts_pace`, `vaani_source_lang`).

**Speaker selector:**  
A styled `<select>` dropdown with the following Sarvam bulbul:v3 speakers:
- `shubh` — Male (default)
- `anushka` — Female  
- `manisha` — Female (soft)
- `vidya` — Female (clear)
- `arjun` — Male (deep)
- `arvind` — Male (formal)
- `amol` — Male (casual)
- `amartya` — Male (warm)

Label: "TTS Voice"  
Helper text: "The speaker voice used for translated audio output."

**Pace slider:**  
A range input: min=0.5, max=2.0, step=0.1, default=1.0.  
Display current value as: `0.8× (Slower)`, `1.0× (Normal)`, `1.5× (Faster)`, etc.  
Show labels "Slow", "Normal", "Fast" below the slider at 0.5, 1.0, 2.0 positions.

**Source Language Lock:**  
A `<select>` dropdown. Options:
- `auto` — Auto-detect (default)
- `en-IN` — English
- `hi-IN` — Hindi  
- `ta-IN` — Tamil
- `te-IN` — Telugu
- `mr-IN` — Marathi

Label: "Source Language"  
Helper text: "Lock input language for bilingual streams to prevent auto-detect errors."

On change for any setting: save to localStorage immediately. Also send `SET_TTS_SETTINGS` message via `obsRelayManager` relay WS so the server can pick up the pace for future TTS calls (but don't wait for it — best-effort).

**Section header:** Use a `Mic` icon from lucide-react, title "Voice & Language", subtitle "Configure TTS voice, speed, and source language detection."

#### Task 2: Add TTSSettingsSection to Settings page

In `src/app/(dashboard)/settings/page.tsx`, import and render `<TTSSettingsSection />` inside the bento grid (after the existing StreamSettingsSection or ApiKeySection, before channels — wherever makes semantic sense).

---

## Plan 14-03: Test Mode Panel UI

**Wave:** 2 (depends on 14-01 for the API, 14-02 for settings)  
**Autonomous:** true  
**Files modified:**
- `src/app/components/TestModePanel.tsx` (CREATE)
- `src/app/(dashboard)/dashboard/page.tsx` (MODIFY — add TestModePanel)

### Tasks

#### Task 1: Create TestModePanel component

Create `src/app/components/TestModePanel.tsx`.

This is a full-featured test panel. It is rendered **below** the main dashboard pipeline monitor, always visible (not hidden behind a modal). It is a glassmorphic card matching the dashboard aesthetic.

**Layout:**
- Card header: Flask/Beaker icon (use `FlaskConical` from lucide-react), title "Pipeline Test", badge "OFFLINE MODE" in amber.
- Below header: a horizontal tab row for preset phrases. Presets (each a short phrase the user can click to autofill):
  - "Hello, welcome to my stream!"
  - "Today we're playing a new game."
  - "Thanks for the raid!"
  - "GG, that was a great match."
  - "Donation received — thank you!"
- Text area: A `<textarea>` placeholder "Type something to test your TTS voice..." with a char counter (max 500). Styled with `bg-gray-50/80 border border-gray-100 rounded-[16px] px-4 py-3 font-dm-sans text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#F5821F]/20`.
- Below textarea: a row with target language checkboxes. Read enabled channels from a `GET /api/channels` fetch on mount (same pattern as Preflight). Render each enabled channel as a pill checkbox (selected by default).
- Run button: "▶ Test Pipeline" — orange gradient button (`bg-gradient-to-r from-[#F5821F] to-[#E8690A]`). Disabled when text is empty or no languages selected. Shows a spinner when loading.
- Results section (shown after run):
  - For each language result: A card with the language name, the translated text (displayed as quoted text), and an inline audio player using a `<audio>` element with `src` set to a data URL constructed from the base64 audio.
  - Auto-play the first result's audio on success.
  - Show timing info: "Translate: 234ms · TTS: 891ms · Total: 1.1s".
- Error state: red error banner below the run button.

**Behavior:**
- On "Run": POST to `/api/test-pipeline` with `{ text, targetLanguages, speaker, pace }` where `speaker` and `pace` are read from `localStorage` (`vaani_tts_speaker`, `vaani_tts_pace`).
- While loading: animate the run button with a spinner.
- On success: render results, auto-play first audio.
- On error: show error banner.

#### Task 2: Mount TestModePanel in the dashboard

In `src/app/(dashboard)/dashboard/page.tsx` (or wherever the dashboard assembles its layout), import `<TestModePanel />` and render it below the existing `<PipelineMonitor />` or `<SessionStats />` component. It should be visible at all times, not behind any modal.

If `page.tsx` is a server component that just exports the layout, find where the dashboard widgets are assembled (likely `DashboardShell.tsx` or similar) and add it there in the main content area.

---

## Plan 14-04: Server-Side TTS Settings Propagation

**Wave:** 2  
**Autonomous:** true  
**Files modified:**
- `server.ts` (MODIFY — handle SET_TTS_SETTINGS message, thread pace/speaker through to pipeline)
- `src/lib/sarvam-pipeline.ts` (MODIFY — add speaker/pace params to textToSpeech)

### Tasks

#### Task 1: Add speaker/pace params to textToSpeech

In `src/lib/sarvam-pipeline.ts`, update the `textToSpeech` function signature to accept optional `speaker?: string` and `pace?: number` params (defaults: `"shubh"`, `1.0`). Pass them into the Sarvam API request body instead of the current hardcoded values.

Update the `runPipeline` function to accept an optional `options?: { speaker?: string; pace?: number; sourceLang?: string }` param and thread `speaker` and `pace` into each `textToSpeech()` call.

#### Task 2: Store TTS settings per-user in server.ts

In `server.ts`:
- Add a new `Map<string, { speaker: string; pace: number; sourceLang: string }>` called `userTTSSettings`.
- Add handler for `SET_TTS_SETTINGS` WebSocket message (add to the `ws.on("message")` handler):
  ```
  } else if (msg.type === "SET_TTS_SETTINGS") {
    userTTSSettings.set(userId, {
      speaker: msg.speaker || "shubh",
      pace: msg.pace || 1.0,
      sourceLang: msg.sourceLang || "auto",
    });
  }
  ```
- Update `executeChunkPipeline` (or wherever `runPipeline` is called) to read from `userTTSSettings.get(userId)` and pass speaker/pace into `runPipeline`.
- Also handle `sourceLang !== "auto"`: if set, use that BCP-47 code as `sourceLang` for the translation call instead of the detected language from STT.
