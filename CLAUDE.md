# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vaani** is a real-time multilingual translation platform for live streamers. It captures audio from OBS (via RTMP), runs it through Sarvam AI's STT → Translate → TTS pipeline, and streams translated audio to YouTube/Twitch. The frontend is a Next.js app with a marketing landing page and a dashboard for streamers.

## Commands

```bash
# Install dependencies
npm install

# Development (runs custom server.ts with Next.js + WebSocket + RTMP)
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

**Dev server runs on port 3000** (Next.js) with an RTMP ingest server on port 1935 (Node Media Server).

## Architecture

### Dual-process architecture

The app runs as a **single Node.js process** (`server.ts`) that combines:

1. **Next.js HTTP server** — handles all page rendering and API routes
2. **WebSocket server** (`/ws/relay`) — real-time communication with dashboard clients
3. **RTMP server** (Node Media Server, port 1935) — receives OBS streams

All three share the same in-memory state ( Maps for active sessions, streamers, pipeline queues).

### Audio pipeline flow

```
OBS → RTMP (port 1935) → FFmpeg audio extraction (PCM 16kHz mono)
  → Voice Activity Detection (RMS + ZCR)
  → WAV wrapping → base64 → per-user serial pipeline queue
  → Sarvam STT → Translate → TTS (per language channel)
  → RTMP streamer (FFmpeg) → YouTube/Twitch
```

Audio chunks are processed through a **per-user serial queue** (`processAudioChunk` / `drainPipelineQueue`) to prevent out-of-order translations and API rate limit exhaustion. Max queue size is 10 — oldest chunks are dropped if it backs up.

### Key server-side modules (`src/lib/`)

- `sarvam-pipeline.ts` — Sarvam AI API calls (STT, translate, TTS) with stage callback hooks
- `rtmp-streamer.ts` — Manages per-user FFmpeg processes for multi-channel RTMP output
- `stream-session.ts` — In-memory session state manager (transcripts, stats, pipeline stages)
- `obs-relay-client.ts` — OBS WebSocket relay (browser-side, connects to OBS for scene switching)
- `language-registry.ts` — Supported languages with Sarvam language codes
- `encryption.ts` — AES-256-GCM encryption/decryption for API keys and passwords
- `csrf.ts` — CSRF token validation for API routes
- `mongodb.ts` — Mongoose connection helper

### Database models (`src/lib/models/`)

- **User** — Clerk auth ID, encrypted Sarvam API key, OBS credentials, onboarding state
- **Channel** — Per-language output config (language, RTMP URL/key, enabled flag)
- **Session** — Completed streaming session records (duration, cost, transcript)
- **WaitlistEntry** — Waitlist signups

### Frontend structure

- `src/app/page.tsx` — Marketing landing page (public)
- `src/app/(auth)/` — Clerk sign-in/sign-up pages
- `src/app/(dashboard)/` — Protected dashboard area:
  - `DashboardShell.tsx` — Main dashboard layout with WebSocket connection
  - `settings/` — TTS settings, channel configuration
  - `channels/` — Language channel management
- `src/app/components/` — Landing page sections (Hero, Features, PlatformStack, etc.)
- `src/app/api/` — Next.js API routes (channels, CSRF, health, key management, OBS, sessions, test-pipeline)
- `src/app/actions/` — Server actions (join-waitlist)

### WebSocket protocol (server ↔ dashboard)

The dashboard connects to `/ws/relay` with a Clerk JWT token (sent as a WebSocket subprotocol). Binary messages are audio chunks; text messages are JSON commands:

- `GO_LIVE` / `STOP_STREAM` — Session control
- `OBS_CONNECTED` / `OBS_DISCONNECTED` — OBS status
- `AUDIO_CHUNK` — Legacy base64 audio (binary preferred)
- `SET_TRANSLATION_SOURCE` — mic_only / desktop_only / mixed
- `SET_TTS_SETTINGS` — speaker, pace, source language

Server pushes: `SESSION_STARTED`, `SESSION_STOPPED`, `SESSION_SNAPSHOT`, `PIPELINE_RESULT`, `PIPELINE_STAGE_UPDATE`, `AUDIO_LEVEL`, `OBS_CREDENTIALS`, `PING`/`PONG`.

## Environment Variables

Required (server will exit if missing):
- `CLERK_SECRET_KEY` — Clerk backend auth
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk frontend auth
- `MONGODB_URI` — MongoDB connection string
- `ENCRYPTION_KEY` — 64-character hex string for AES-256-GCM encryption of API keys/passwords

## Key Patterns

- **Credential encryption**: All secrets (Sarvam keys, OBS passwords, RTMP keys) are encrypted with AES-256-GCM before storage. The `decryptValue()` function splits on `:` to extract iv:authTag:ciphertext.
- **Per-user caching**: Pipeline credentials are cached in-memory for 60 seconds to avoid DB queries on every 3-second audio chunk.
- **Hot-reload on settings change**: Changing translation source stops and restarts the FFmpeg audio extractor after a 1s delay.
- **Auto-stop on disconnect**: OBS disconnect or WebSocket close automatically stops the session, saves to DB, and cleans up FFmpeg processes.
- **Graceful shutdown**: SIGTERM/SIGINT stops all streamers, audio extractors, and servers before exit.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
