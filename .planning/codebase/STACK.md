# Technology Stack

## Core
- **Framework**: Next.js 16.2.2 (App Router)
- **Runtime**: Node.js 22 (Custom server setup via `server.ts`)
- **Language**: TypeScript 5
- **Logic**: tsx (for custom server execution)

## Frontend
- **Library**: React 19.2.4
- **Animations**: Framer Motion 12.38.0
- **Icons**: Lucide React 1.7.0
- **Styling**: Tailwind CSS 4 (PostCSS)
- **Design System**: Floating Glass (Glassmorphism, vibrant gradients)

## Backend & Infrastructure
- **WebSocket**: Native `ws` 8.20.0
- **Database**: MongoDB via Mongoose 9.3.3
- **Authentication**: Clerk 7.0.8 (Google OAuth)
- **Validation**: Zod 4.3.6

## Utilities
- **OBS Control**: obs-websocket-js 5.0.8
- **Encryption**: AES-256-GCM (Custom implementation in `src/lib/encryption.ts`)
- **Rate Limiting**: Sliding window engine in `src/lib/rate-limit.ts`

## Configuration
- `.env`: Environment variables
- `next.config.ts`: Next.js configuration
- `tsconfig.json`: TypeScript configuration
- `eslint.config.mjs`: Linting rules
