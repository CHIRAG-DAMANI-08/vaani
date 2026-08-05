# Requirements: Vaani

**Defined:** 2026-08-05
**Core Value:** Real-time multilingual translation for live streamers, voice-to-voice.

## v1.0 - MVP (Completed)

- **REQ-001**: User authentication via Clerk (Google OAuth).
- **REQ-002**: Secure storage and management of Sarvam AI API keys.
- **REQ-003**: Integration with OBS Studio via WebSocket for credential syncing.
- **REQ-004**: Implementation of a multi-stage AI pipeline (STT -> Translate -> TTS).
- **REQ-005**: Real-time dashboard with pipeline monitor and session statistics.

## v1.1 - Streaming & Broadcast (Completed)

- **REQ-006**: RTMP output streaming logic to route TTS audio to external endpoints.
- **REQ-007**: FFmpeg-based audio relay for continuous streaming.
- **REQ-008**: Channel-specific RTMP configuration (URL, Stream Key).
- **REQ-009**: Stream health monitoring and status feedback on dashboard.

## v1.2 - Per-Language Voice & Pace + Latency Mode

### Per-Channel Voice & Pace

- [ ] **VOICE-01**: User can set a distinct TTS voice per channel, overriding the global voice for that language
- [ ] **VOICE-02**: User can set a distinct TTS pace per channel, overriding the global pace
- [ ] **VOICE-03**: User can leave a channel's voice/pace unset to inherit the global TTS settings ("Use global default")
- [ ] **VOICE-04**: Per-channel voice and pace persist in MongoDB and survive session restarts
- [ ] **VOICE-05**: Per-channel voice and pace apply to new audio chunks mid-stream without a session restart

### Latency vs Quality Mode

- [ ] **LAT-01**: User can select a global latency mode: Snappy / Balanced / Studio
- [ ] **LAT-02**: Latency mode determines the audio chunk size sent to Sarvam STT
- [ ] **LAT-03**: Changing latency mode applies mid-stream without restarting the session

### Per-Channel Audio Routing (prerequisite)

- [ ] **ROUTE-01**: Each RTMP output carries only its own channel's translated audio (not a mix of all enabled languages)
- [ ] **ROUTE-02**: The RTMP streamer accepts one TTS input pipe per enabled channel with per-output stream selection

## Out of Scope

| Feature | Reason |
|---------|--------|
| TTS sample-rate lowering per mode (24k → 16k) | A second latency lever users must reason about; defer to v2+ |
| Voice cloning / same voice across languages | Sarvam bulbul has no voice preservation; per-language voice IS the differentiator |
| Per-stream latency-mode override recorded on Session | Cost estimation per mode; defer to billing milestone |
| Multi-user collaboration on a single stream | High complexity, not core to the value |
| Advanced video overlay management | Handled by OBS |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VOICE-01 | TBD | Pending |
| VOICE-02 | TBD | Pending |
| VOICE-03 | TBD | Pending |
| VOICE-04 | TBD | Pending |
| VOICE-05 | TBD | Pending |
| LAT-01 | TBD | Pending |
| LAT-02 | TBD | Pending |
| LAT-03 | TBD | Pending |
| ROUTE-01 | TBD | Pending |
| ROUTE-02 | TBD | Pending |

**Coverage:**
- v1.2 requirements: 10 total
- Mapped to phases: 0
- Unmapped: 10 ⚠️ (filled by roadmap)

---
*Requirements defined: 2026-08-05*
*Last updated: 2026-08-05 after milestone v1.2 definition*
