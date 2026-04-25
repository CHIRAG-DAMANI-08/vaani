# Phase 06 Research: RTMP Output Streaming

## Overview
This phase involves routing processed audio from the Sarvam AI pipeline (TTS stage) to external RTMP destinations. Each user session can have multiple localized channels (e.g., Hindi, Tamil), and each needs its own RTMP stream.

## Core Technology
- **FFmpeg**: The industry standard for media processing and streaming.
- **Node.js `child_process`**: To spawn FFmpeg workers and pipe audio data.

## Key Findings

### 1. Handling Multi-Destination Streaming
Using FFmpeg's **tee muxer** is the most efficient way to stream to multiple destinations from a single source.
- **Example**: `ffmpeg -i pipe:0 -c:a aac -f tee "[f=flv]rtmp://server1/key|[f=flv]rtmp://server2/key"`
- **Critical Flag**: `:onfail=ignore` ensures one dead connection doesn't kill the entire process.

### 2. Audio Format Synchronization
- **Sarvam TTS Output**: Returns base64 WAV chunks (24kHz, 1-channel, 16-bit PCM).
- **FFmpeg Input**: Concatenating WAV files directly causes "header noise" at the start of each chunk.
- **Solution**: Convert WAV chunks to raw PCM (s16le) before piping to the streaming FFmpeg instance, or use `-f wav` and manage headers.
- **Optimal Pipeline**: `Sarvam WAV` -> `Buffer` -> `Strip Header` -> `Main FFmpeg (s16le input)`.

### 3. Latency & Buffering
- RTMP has an inherent latency of 2-5 seconds.
- FFmpeg buffering (`-probesize`, `-analyzeduration`) should be minimized for real-time feel.
- **Recommended Flags**: `-fflags nobuffer`, `-flags low_delay`.

### 4. Reconnection & Reliability
- Network drops are common in RTMP.
- **Solution**: Use FFmpeg's `fifo` muxer or a wrapper that restarts the process on fatal errors.
- **Dashboard Feedback**: Monitor `stderr` from FFmpeg for "Connection refused" or "Write failed" errors to update UI status.

## Implementation Strategy
1. **FFmpeg Manager**: A class in `server.ts` or a new lib to manage spawning/killing FFmpeg processes per session.
2. **Audio Pipe**: A stream-based relay that pushes raw PCM data into FFmpeg's `stdin`.
3. **Channel Mapping**: Dynamically build the `tee` output string based on the user's enabled channels and their RTMP settings.
