# Phase 06 Context: RTMP Output Streaming

## Vision
Route the translated audio from the Sarvam AI pipeline to configured RTMP broadcast destinations, enabling real-time localized streaming for Vaani users.

## Essentials
- **Single Process per Session**: One FFmpeg process per user session to manage all channel outputs.
- **Dynamic Configuration**: Read RTMP URLs and Stream Keys from the user's `Channel` documents in MongoDB.
- **Audio Integrity**: Ensure seamless concatenation of TTS audio chunks into a continuous RTMP stream.
- **Dashboard Feedback**: Synchronize RTMP connection status with the "Live" indicators in the UI.

## Boundaries
- **No Video Encoding**: This phase is audio-only. Video is handled by the user's primary streaming software (OBS).
- **Single Bitrate**: Use a standard high-quality bitrate (128kbps AAC) for all channels.
- **No Local Persistence**: TTS audio is streamed directly; no MP3/WAV files are saved on the server.

## Success Criteria
- [ ] User can enable a channel with RTMP settings and see it "Go Live" on the dashboard.
- [ ] Processed TTS audio is audible on the destination platform (e.g., YouTube/Twitch).
- [ ] Multi-channel streaming works concurrently (e.g., Hindi and Tamil channels streaming at once).
- [ ] No significant memory leaks from dangling FFmpeg processes.
