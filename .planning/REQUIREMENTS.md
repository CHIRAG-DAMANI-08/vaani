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
| VOICE-01 | Phase 19 | Pending |
| VOICE-02 | Phase 19 | Pending |
| VOICE-03 | Phase 19 | Pending |
| VOICE-04 | Phase 19 | Pending |
| VOICE-05 | Phase 19 | Pending |
| LAT-01 | Phase 20 | Pending |
| LAT-02 | Phase 20 | Pending |
| LAT-03 | Phase 20 | Pending |
| ROUTE-01 | Phase 18 | Pending |
| ROUTE-02 | Phase 18 | Pending |

**Coverage:**
- v1.2 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

**Phase mapping notes:**
- ROUTE-01, ROUTE-02 → Phase 18 (per-channel audio routing, prerequisite)
- VOICE-01..05 → Phase 19 (per-channel voice & pace)
- LAT-01..03 → Phase 20 (latency mode)
- Phase 17 is a de-risking spike with no requirement of its own; it gates the routing build and validates the speaker/model facts Phases 19-20 depend on.

---
*Requirements defined: 2026-08-05*
*Last updated: 2026-08-05 after milestone v1.2 roadmap*
