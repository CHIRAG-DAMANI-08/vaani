# Phase 17: Validation Spike - Context

**Gathered:** 2026-08-05
**Status:** Ready for planning

<domain>
## Phase Boundary

De-risk the milestone before any build work. Produce a recorded go/no-go on FFmpeg tee per-output audio routing against a real Node-Media-Server ingest (the architectural prerequisite for per-language voice), validate the Sarvam TTS speaker allowlist, confirm the STT model string, and decide concrete latency-mode constants. Outputs feed Phases 18 (Routing), 19 (Voice & Pace), 20 (Latency Mode). No user-facing UI — this phase produces validated facts and decisions.

</domain>

<decisions>
## Implementation Decisions

### Fallback posture (LOCKED)
- If Option B (one FFmpeg per user, N TTS stdin pipes, per-output `select`) fails the live spike, **Option A (N separate streamers per user) is the locked fallback** — Phase 18 builds it, accepting the NMS multi-play risk. No mid-milestone re-litigation; the spike records go/no-go + rationale only.

### Speaker failure policy (LOCKED)
- When a Sarvam speaker probe fails validation, **map the channel to the closest valid voice** so the language keeps a distinct voice. Do NOT silently substitute `shubh`. The closest-valid mapping table is a spike deliverable.

### Latency default (user-delegated → Claude chose)
- **Balanced (3s chunk) is the default latency mode** — the least-latency/most-accuracy sweet spot: Snappy's 1.5-2s chunk multiplies Sarvam request rate ~2-3x and risks queue saturation + VAD drift; Studio's 4-5s chunk bumps against the 15s pipeline timeout / 2500-char ceiling.
- Constants to validate in the spike: Snappy 1.5-2s (never 1s), Balanced 3s, Studio 4-5s — bounded by the 15s STT timeout.

### Spike rigor (LOCKED)
- **Live e2e test**: real Node-Media-Server ingest + FFmpeg tee with 2+ RTMP destinations, routing distinct audio per output via `select`. Recorded go/no-go for Option B. A synthetic/file-only harness is insufficient.
- STT model string confirmed (`saarika:v2`) — no mid-milestone migration.

### Claude's Discretion
- Exact FFmpeg test harness mechanics (test source, port choice, how destinations are observed)
- How "closest valid speaker" is measured/ranked
- Where the validated facts (speaker allowlist, latency constants) are recorded for Phases 18-20

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & success criteria
- `.planning/ROADMAP.md` §Phase 17 — The four success criteria this spike must prove

### Research
- `.planning/research/ARCHITECTURE.md` — Option A vs Option B analysis, per-output `select` mechanics, NMS multi-play flakiness
- `.planning/research/SUMMARY.md` — milestone synthesis; Option B recommendation, why routing is a prerequisite
- `.planning/research/PITFALLS.md` — NMS multi-play risk, VAD threshold drift, queue saturation at short chunks
- `.planning/research/STACK.md` — installed versions (ffmpeg-static 5.3.0, node-media-server, mongoose 9.3.3), no new deps

### Code to validate
- `src/lib/rtmp-streamer.ts` §140-205 — current single-input `tee` (the thing Option B replaces; today all outputs carry the same mixed audio)
- `server.ts` §388-445 — `startAudioExtraction()`, hardcoded `CHUNK_SIZE = 32000 * 3`, VAD RMS+ZCR
- `src/lib/language-registry.ts` §22-89 — `defaultSpeaker` per language (shubh/arjun/anushka…), the allowlist to validate
- `.planning/codebase/ARCHITECTURE.md` — overall pipeline architecture

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/rtmp-streamer.ts` — the FFmpeg arg-builder to fork/extend for the Option B spike; already owns tee muxer logic
- `server.ts` `startAudioExtraction()` — the chunking/extraction path whose `CHUNK_SIZE` becomes mode-driven in Phase 20
- `src/lib/language-registry.ts` — the `defaultSpeaker` list that becomes the validated allowlist

### Established Patterns
- node-media-server listens on `rtmp://localhost:1935/live` (Phase 8 decision)
- FFmpeg `tee` muxer as the output architecture; single spawn per user
- Serial per-user processing queue; audio is 16kHz 16-bit mono PCM

### Integration Points
- `rtmp-streamer.ts` — where Option B (N TTS pipes + per-output select) lands if go, or Option A (N streamers) if no-go
- `src/lib/language-registry.ts` — validated speaker allowlist + closest-valid mapping consumed by Phase 19
- `server.ts` — validated latency constants feed Phase 20's mode-driven `CHUNK_SIZE`

</code_context>

<specifics>
## Specific Ideas

- The spike should produce a **closest-valid speaker mapping table** (language → speaker → closest valid alternative) as a concrete deliverable for Phase 19.
- Latency-mode constants must be recorded somewhere Phases 18-20 can read (e.g., documented in the spike report / STATE.md).

</specifics>

<deferred>
## Deferred Ideas

- Revisit whether Snappy should be default after real-user latency/accuracy testing — v1.3+ decision, not this milestone.

</deferred>

---
*Phase: 17-validation-spike*
*Context gathered: 2026-08-05*
