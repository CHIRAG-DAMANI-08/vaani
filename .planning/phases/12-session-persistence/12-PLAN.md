---
phase: 12
title: "Session Persistence & History"
goal: "Write completed streaming sessions to MongoDB for historical review and data export."
status: complete
---

# Phase 12: Session Persistence & History

## What Changed

### 1. Database Model
- Created `Session` model in `src/lib/models/session.ts` to store:
  - Duration, cost, chunks processed
  - Active languages
  - Full transcript array

### 2. Backend Persistence (server.ts & stream-session.ts)
- `SessionData` now tracks the full array of transcript lines natively (not just the last 15).
- `stopSession` calculates final `durationMs`.
- When OBS disconnects, user clicks stop, or WS connection is closed, the server invokes `saveSessionToDb(userId, sessionData)`.
- The `saveSessionToDb` writes a new document to the `sessions` MongoDB collection.

### 3. Dashboard Updates (page.tsx)
- The main `DashboardPage` is now a Server Component that fetches past sessions directly from MongoDB.
- Calculates cumulative usage via a MongoDB aggregation pipeline (Total Duration, Cost, and Chunks).
- Passes the top 5 most recent sessions to a new `PastSessions` client component.

### 4. Past Sessions View (PastSessions.tsx)
- Lists recent sessions with start date, duration in minutes, and estimated cost.
- Click-to-expand UI reveals the full transcript text captured during that session.
- Subdued, beautiful glass-morphism matching the dashboard's design system.

### 5. Data Export (api/sessions/export)
- The "Export Data" button in the dashboard header is now fully functional.
- It links to `GET /api/sessions/export` which returns a `.json` file containing all past sessions and transcripts for the user.

## Files Modified
- `src/lib/models/session.ts` (New)
- `src/lib/stream-session.ts`
- `server.ts`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/PastSessions.tsx` (New)
- `src/app/api/sessions/route.ts` (New)
- `src/app/api/sessions/export/route.ts` (New)
