# Directory Structure

## Root Files
- `server.ts`: Entry point for custom HTTP + WebSocket server.
- `VAANI_CONTEXT.md`: Project summary and sprint tracking.
- `package.json`: Project dependencies and scripts.

## `src/` - Source Code
- `src/app/`: Next.js App Router (pages, layouts, API routes).
  - `(auth)/`: Authentication pages (Sign-in, Sign-up, SSO).
  - `(dashboard)/`: Protected user dashboard and shell.
  - `api/`: REST API endpoints for keys, OBS status, and channels.
- `src/components/`: Reusable UI components (Modals, Buttons, Section headers).
- `src/lib/`: Business logic and utility functions.
  - `models/`: Mongoose schemas (User, Channel, Waitlist).
  - `sarvam-pipeline.ts`: AI processing engine.
  - `stream-session.ts`: Session state management.
  - `obs-relay-client.ts`: WebSocket relay manager.
  - `encryption.ts`: AES-256-GCM utilities.
  - `rate-limit.ts`: Throttling logic.
  - `mongodb.ts`: DB connection singleton.
- `src/actions/`: Server Actions (e.g., join-waitlist).

## `public/` - Static Assets
- `/auth-bg.png`: Background images for branding.
- `/favicon.ico`: App icon.

## `.planning/` - Project Management
- `codebase/`: Current document set (automated).
- `phases/`: Planned and completed sprint artifacts.
- `ui-reviews/`: Visual audit reports.
