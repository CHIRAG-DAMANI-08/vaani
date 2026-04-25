# External Integrations

## AI Services
### Sarvam AI
- **Purpose**: Speech-to-Text (STT), Translation, and Text-to-Speech (TTS).
- **Models**: 
  - STT: `saarika:v2.5`
  - TTS: `bulbul:v3`
- **Endpoints**: `https://api.sarvam.ai/speech-to-text`, `/translate`, `/text-to-speech`
- **Authentication**: `api-subscription-key` header (encrypted at rest).
- **Implementation**: `src/lib/sarvam-pipeline.ts`

## Streaming & Video
### OBS Studio
- **Purpose**: Local audio/video capture.
- **Protocol**: WebSocket (v5.x).
- **Port**: 4455 (Default).
- **Implementation**: `src/lib/obs-relay-client.ts`, `server.ts` (relay).

## Authentication
### Clerk
- **Purpose**: User management, session handling, Google OAuth.
- **Implementation**: `middleware.ts`, `src/app/(auth)/`, `server.ts` (WS auth).

## Database
### MongoDB Atlas
- **Purpose**: Persistent storage for user settings, channel configs, and session history.
- **Library**: Mongoose.
- **Implementation**: `src/lib/mongodb.ts`, `src/lib/models/`

## Messaging
### WebSocket (Native)
- **Purpose**: Real-time communication between OBS Relay and Frontend Dashboard.
- **Endpoint**: `ws://localhost:3000/ws/relay`
- **Implementation**: `server.ts`
