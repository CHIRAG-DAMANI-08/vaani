# Project: Vaani

## Vision
Vaani is a high-performance audio translation and streaming platform. It allows streamers to connect their OBS Studio instance, capture audio, translate it in real-time using Sarvam AI, and broadcast translated audio to multiple localized RTMP channels.

## Core Features
- **Real-time Audio Capture**: Low-latency capture from OBS Studio via WebSocket.
- **AI-Powered Translation**: Multi-stage pipeline (STT -> Translate -> TTS) using Sarvam AI.
- **Multi-Channel Streaming**: Concurrent broadcast to multiple RTMP destinations with localized audio.
- **Glassmorphism UI**: High-fidelity dashboard with real-time pipeline monitoring and session stats.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), Tailwind CSS 4, Framer Motion, Lucide React.
- **Backend**: Node.js 22 (Custom server), WebSocket (ws), Clerk (Auth).
- **Data**: MongoDB Atlas (Mongoose).
- **Integrations**: Sarvam AI (saarika:v2.5, bulbul:v3), OBS WebSocket v5.

## Status
- **Phase 1-5**: Completed (Foundation, Auth, Keys, OBS Connection, AI Pipeline).
- **Phase 6**: RTMP Output Streaming (Current Focus).
