---
phase: 13
title: "Onboarding & Preflight"
goal: "Ensure a frictionless, error-free first-time user experience via a state-driven setup wizard, and enforce a preflight checklist to prevent silent stream failures."
status: complete
---

# Phase 13: Onboarding & Preflight

## Executive Summary
This phase tackles the critical "Time to First Stream" (TTFS) metric and system reliability. Currently, a user can click "Go Live" without an API key, without an active channel, or without OBS connected, leading to silent failures and a poor UX. This phase introduces a **First-Time Setup Wizard** to guide new users, a **Preflight Checklist** to act as a safety gate before streaming, and **Contextual Guidance** for complex features like OBS stereo panning.

---

## 1. First-Time Setup Wizard (`OnboardingWizard.tsx`)

### Goal
Guide brand new users through the required steps to get their Vaani environment ready for streaming.

### Trigger Logic
- Evaluated on the `DashboardShell` load.
- **Condition**: User has `0` Channels configured OR the API key status is `disconnected`.
- A global state (or local storage flag tied to the `clerkId`) can track `hasCompletedOnboarding` to prevent flashing the modal on subsequent visits if they intentionally delete channels.

### Wizard Flow (Step-by-Step)
The wizard uses a Stepper UI pattern (Step 1, 2, 3) with smooth animations between steps.

**Step 1: Welcome & API Key Setup**
- **UI**: A warm welcome message explaining Vaani's core value.
- **Input**: A secure text input for the Sarvam API Key.
- **Action**: Validates the key via `/api/key` endpoint. If valid, saves it and advances to Step 2.

**Step 2: Add First Channel**
- **UI**: A simplified form to add a destination.
- **Inputs**: 
  - Platform/Language selection (e.g., YouTube - Hindi).
  - RTMP Server URL.
  - Stream Key.
- **Action**: Saves the channel via `/api/channels` endpoint. Enables it by default.

**Step 3: Connect OBS & Source Routing**
- **UI**: Displays the user's *Vaani Ingest URL* (`rtmp://localhost:1935/live`) and *Ingest Stream Key* (their `clerkId`).
- **Instructions**: "Copy these into OBS Studio (Settings -> Stream -> Custom)."
- **Live Check**: The wizard polls or listens to the WebSocket for the `OBS_CONNECTED` event.
- **Completion**: Once OBS connects, a celebratory animation plays, and the wizard closes, dropping the user into the main dashboard ready to hit "Go Live".

---

## 2. Go-Live Preflight Checklist (`PreflightModal.tsx`)

### Goal
Prevent the user from initiating a streaming session if their environment is not configured correctly, thereby eliminating confusing silent errors.

### Trigger Logic
- Intercept the `Go Live` button click in `DashboardShell.tsx`.
- Instead of immediately emitting the `GO_LIVE` WebSocket event, open the `<PreflightModal />`.

### The 4 Pillars of the Preflight Check
When the modal opens, it runs four checks in real-time. Each check displays a spinner, followed by a ✅ (Green Check) or ❌ (Red Cross).

1. **API Key Verification**:
   - *Check*: Is `keyStatus.connected` true?
   - *Failure Resolution*: "Connect API Key" button -> Links to Settings.
2. **Channel Verification**:
   - *Check*: Does the user have at least 1 channel with `enabled: true`?
   - *Failure Resolution*: "Enable a Channel" button -> Links to Channels page.
3. **OBS Connection**:
   - *Check*: Is the `obsRelayManager.obsStatus.obsConnected` true?
   - *Failure Resolution*: Show the RTMP ingest details and say "Waiting for OBS stream...".
4. **Audio Source Selection**:
   - *Check*: Is a translation source (`mic_only`, `desktop_only`, `mixed`) explicitly selected?
   - *Failure Resolution*: "Select Audio Source" dropdown inline.

### Execution
- The actual "Start Streaming" button at the bottom of the modal remains **disabled** until all 4 checks pass.
- Once all are green, clicking "Start Streaming" closes the modal, fires the `GO_LIVE` WebSocket event, and the session begins.

---

## 3. OBS Stereo Panning Guide (`OBSGuideModal.tsx`)

### Goal
Educate users on how to achieve hardware-level source separation using OBS, which is critical for the "Translate Mic Only" feature to work without background noise interference.

### Location & Trigger
- Added next to the "Translate Audio From" dropdown in `StreamSettingsSection.tsx` (e.g., a subtle info icon or a "How do I do this?" text link).

### Content & Visuals
A clean, visually appealing modal containing:
- **Prerequisite**: "To separate game audio from your voice, Vaani expects Desktop audio on the Left channel and Mic audio on the Right channel."
- **Step 1: Open Advanced Audio Properties**: Explain where to click in OBS (Gear icon in Audio Mixer).
- **Step 2: Pan the Sliders**: 
  - Visual diagram showing the Desktop Audio slider dragged 100% Left.
  - Visual diagram showing the Mic Audio slider dragged 100% Right.
- **Step 3: Downmix to Mono (Important)**: Remind the user that if they are recording locally, this might make the recording sound weird, but it is necessary for the RTMP stream separation.
- **Close Action**: "Got it".

---

## 4. Contextual Tooltips & Microcopy

### Goal
Reduce clutter on the dashboard while keeping complex technical metrics accessible to users who want to understand them.

### Implementation Details
- Create a reusable, glassmorphic `<Tooltip>` component using Radix UI Tooltip or a simple Tailwind `group-hover` utility with smooth fade-in animations.

### Tooltip Targets
1. **Audio Meter (VAD Status)**:
   - Hovering over `Speech` / `Noise` / `Silent` explains: "Voice Activity Detection (VAD) identifies when you are speaking. Vaani only translates chunks marked as Speech to save costs."
2. **Session Stats (Chunks)**:
   - Hovering over `Chunks` explains: "Audio is processed in 3-second blocks. This is the total number of blocks sent for translation."
3. **Session Stats (Latency)**:
   - Hovering over `Latency` explains: "The time it takes for audio to be transcribed, translated, converted to speech, and pushed to your destination."

---

## Implementation Roadmap

### Step 1: Component Foundation
1. Build the generic `<Tooltip>` wrapper.
2. Apply tooltips to the `AudioMeter` and `SessionStats` components.

### Step 2: Educational Modals
1. Build `<OBSGuideModal />`.
2. Integrate it into `StreamSettingsSection.tsx`.

### Step 3: Preflight Checklist
1. Build `<PreflightModal />` UI with the 4 status indicators.
2. Wire up the state (reading from `obsRelayManager`, API key context, and channel context).
3. Intercept the `Go Live` button in `DashboardShell.tsx`.

### Step 4: The Onboarding Wizard
1. Build `<OnboardingWizard />` as a multi-step modal.
2. Implement the API hooks for step 1 (API Key save) and step 2 (Channel save).
3. Add the evaluation logic in `DashboardShell.tsx` to pop the wizard if `channels.length === 0`.

## Definition of Done (DoD)
- [ ] A new user without channels sees the Onboarding Wizard upon logging in.
- [ ] The Wizard successfully provisions an API key and a Channel.
- [ ] Clicking "Go Live" opens the Preflight modal instead of instantly starting.
- [ ] Preflight accurately reflects the live state of OBS, Keys, and Channels.
- [ ] Tooltips render correctly without clipping off-screen.
