/**
 * Stream Session Manager — Global state for active streaming sessions.
 *
 * Tracks per-user session state including:
 *  - Pipeline stage statuses
 *  - Transcript lines
 *  - Session stats (duration, chunks, cost, languages)
 *  - Active channel list
 *
 * This runs in the Node.js server process (server.ts) and is
 * read by WebSocket handlers to push updates to the frontend.
 */

import type { PipelineStageStatus } from "./sarvam-pipeline";

export type StageState = {
  status: PipelineStageStatus;
  value: string; // display value (e.g. "1.2s", "error")
};

export type SessionData = {
  userId: string;
  active: boolean;
  startedAt: number;
  stages: {
    stt: StageState;
    translate: StageState;
    tts: StageState;
    stream: StageState;
  };
  /** Rolling transcript — last 15 lines */
  transcriptLines: string[];
  /** Stats */
  chunksProcessed: number;
  activeLanguages: string[];
  /** Estimated cost in INR — rough approximation */
  estimatedCostINR: number;
  /** Throughput — chunks per second (rolling average) */
  chunksPerSecond: number;
  /** Rolling average latency in ms */
  avgLatencyMs: number;
  /** Latest error message */
  lastError: string | null;
};

// Sarvam pricing approximation (per API call)
const COST_PER_STT_CALL = 0.02;    // ₹0.02 per STT call (approx)
const COST_PER_TRANSLATE = 0.005;   // ₹0.005 per translate call
const COST_PER_TTS_CALL = 0.02;    // ₹0.02 per TTS call

function createDefaultSession(userId: string): SessionData {
  return {
    userId,
    active: false,
    startedAt: 0,
    stages: {
      stt: { status: "idle", value: "—" },
      translate: { status: "idle", value: "—" },
      tts: { status: "idle", value: "—" },
      stream: { status: "idle", value: "—" },
    },
    transcriptLines: [],
    chunksProcessed: 0,
    activeLanguages: [],
    estimatedCostINR: 0,
    chunksPerSecond: 0,
    avgLatencyMs: 0,
    lastError: null,
  };
}

class StreamSessionManager {
  private sessions = new Map<string, SessionData>();
  private chunkTimestamps = new Map<string, number[]>(); // for throughput calc
  private latencyHistory = new Map<string, number[]>(); // rolling latency window

  getSession(userId: string): SessionData {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, createDefaultSession(userId));
    }
    return this.sessions.get(userId)!;
  }

  startSession(userId: string, languages: string[]): SessionData {
    const session = createDefaultSession(userId);
    session.active = true;
    session.startedAt = Date.now();
    session.activeLanguages = languages;
    this.sessions.set(userId, session);
    this.chunkTimestamps.set(userId, []);
    this.latencyHistory.set(userId, []);
    return session;
  }

  stopSession(userId: string): SessionData {
    const session = this.getSession(userId);
    session.active = false;
    session.stages = {
      stt: { status: "idle", value: "—" },
      translate: { status: "idle", value: "—" },
      tts: { status: "idle", value: "—" },
      stream: { status: "idle", value: "—" },
    };
    this.chunkTimestamps.delete(userId);
    this.latencyHistory.delete(userId);
    return session;
  }

  updateStage(
    userId: string,
    stage: "stt" | "translate" | "tts" | "stream",
    status: PipelineStageStatus,
    value?: string
  ) {
    const session = this.getSession(userId);
    session.stages[stage] = {
      status,
      value: value || (status === "active" ? "..." : status === "error" ? "Error" : "—"),
    };
  }

  addTranscriptLine(userId: string, line: string) {
    const session = this.getSession(userId);
    session.transcriptLines.push(line);
    // Keep last 15 lines
    if (session.transcriptLines.length > 15) {
      session.transcriptLines = session.transcriptLines.slice(-15);
    }
  }

  recordChunkProcessed(userId: string, langCount: number) {
    const session = this.getSession(userId);
    session.chunksProcessed += 1;

    // Cost estimation: 1 STT + N translations + N TTS
    session.estimatedCostINR +=
      COST_PER_STT_CALL +
      COST_PER_TRANSLATE * langCount +
      COST_PER_TTS_CALL * langCount;

    // Throughput calculation (chunks in the last 10 seconds)
    const now = Date.now();
    const timestamps = this.chunkTimestamps.get(userId) || [];
    timestamps.push(now);
    // Remove timestamps older than 10s
    const cutoff = now - 10_000;
    const recent = timestamps.filter((t) => t > cutoff);
    this.chunkTimestamps.set(userId, recent);
    session.chunksPerSecond = recent.length / 10;
  }

  setError(userId: string, error: string) {
    const session = this.getSession(userId);
    session.lastError = error;
  }

  /** Record pipeline latency for a processed chunk */
  recordLatency(userId: string, totalMs: number) {
    const session = this.getSession(userId);
    const history = this.latencyHistory.get(userId) || [];
    history.push(totalMs);
    // Keep last 10 measurements for rolling average
    if (history.length > 10) history.shift();
    this.latencyHistory.set(userId, history);
    session.avgLatencyMs = Math.round(
      history.reduce((a, b) => a + b, 0) / history.length
    );
  }

  isActive(userId: string): boolean {
    return this.getSession(userId).active;
  }

  /** Build a serializable snapshot for sending over WebSocket */
  getSnapshot(userId: string): SessionSnapshot {
    const session = this.getSession(userId);
    const durationMs = session.active ? Date.now() - session.startedAt : 0;

    return {
      active: session.active,
      stages: session.stages,
      transcriptLines: session.transcriptLines,
      stats: {
        durationMs,
        durationFormatted: formatDuration(durationMs),
        chunksProcessed: session.chunksProcessed,
        estimatedCostINR: Math.round(session.estimatedCostINR * 100) / 100,
        activeLanguages: session.activeLanguages.length,
        chunksPerSecond: Math.round(session.chunksPerSecond * 10) / 10,
        avgLatencyMs: session.avgLatencyMs,
      },
      lastError: session.lastError,
    };
  }
}

export type SessionSnapshot = {
  active: boolean;
  stages: SessionData["stages"];
  transcriptLines: string[];
  stats: {
    durationMs: number;
    durationFormatted: string;
    chunksProcessed: number;
    estimatedCostINR: number;
    activeLanguages: number;
    chunksPerSecond: number;
    avgLatencyMs: number;
  };
  lastError: string | null;
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Singleton — survives hot reloads via global
const globalAny: any = global;
export const sessionManager: StreamSessionManager =
  globalAny.__vaaniSessionManager || new StreamSessionManager();
globalAny.__vaaniSessionManager = sessionManager;
