# Requirements

## v1.0 - MVP (Completed)
- **REQ-001**: User authentication via Clerk (Google OAuth).
- **REQ-002**: Secure storage and management of Sarvam AI API keys.
- **REQ-003**: Integration with OBS Studio via WebSocket for credential syncing.
- **REQ-004**: Implementation of a multi-stage AI pipeline (STT -> Translate -> TTS).
- **REQ-005**: Real-time dashboard with pipeline monitor and session statistics.

## v1.1 - Streaming & Broadcast (Current)
- **REQ-006**: RTMP output streaming logic to route TTS audio to external endpoints.
- **REQ-007**: FFmpeg-based audio relay for continuous streaming.
- **REQ-008**: Channel-specific RTMP configuration (URL, Stream Key).
- **REQ-009**: Stream health monitoring and status feedback on dashboard.

## Out of Scope
- Multi-user collaboration on a single stream.
- Advanced video overlay management (handled by OBS).
