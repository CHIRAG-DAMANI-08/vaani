import OBSWebSocket from "obs-websocket-js";
import type { SessionSnapshot } from "./stream-session";

export type RTMPChannelStatus = {
  channelId: string;
  languageId: string;
  status: "connecting" | "live" | "error" | "stopped";
  error?: string;
};

export type RTMPSnapshot = {
  active: boolean;
  channels: RTMPChannelStatus[];
};

type ConnectionState = "connected" | "disconnected" | "reconnecting" | "unconfigured";

type StageState = { status: string; value: string };

export type PipelineUpdate = {
  stage: string;
  status: string;
  data?: any;
};

export type PipelineResult = {
  transcript: string;
  translations: { language: string; text: string }[];
  ttsCount: number;
  timings: { stt: number; translate: number; tts: number; total: number };
  error: string | null;
};

class OBSRelayManager {
  private static instance: OBSRelayManager;
  private relayWs: WebSocket | null = null;
  private obsClient: OBSWebSocket = new OBSWebSocket();
  private credentials: { host: string; port: number; password?: string } | null = null;
  
  private retryCount = 0;
  private maxRetries = 5;
  private backoffDelays = [2000, 4000, 8000, 16000, 30000];
  private retryTimeout: NodeJS.Timeout | null = null;
  
  public state: ConnectionState = "unconfigured";
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  
  // ── Streaming state ──
  private _isStreaming = false;
  private streamListeners: Set<(streaming: boolean) => void> = new Set();
  
  // ── Session snapshot ──
  private _sessionSnapshot: SessionSnapshot | null = null;
  private snapshotListeners: Set<(snapshot: SessionSnapshot) => void> = new Set();

  // ── Pipeline events ──
  private pipelineListeners: Set<(update: PipelineUpdate) => void> = new Set();
  private pipelineResultListeners: Set<(result: PipelineResult) => void> = new Set();
  private errorListeners: Set<(error: string) => void> = new Set();

  // ── RTMP status ──
  private _rtmpSnapshot: RTMPSnapshot | null = null;
  private rtmpListeners: Set<(snapshot: RTMPSnapshot) => void> = new Set();

  // ── Audio capture ──
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunkInterval: NodeJS.Timeout | null = null;
  
  private isConnectingOBS = false;

  private constructor() {}

  public static getInstance(): OBSRelayManager {
    if (!OBSRelayManager.instance) {
      OBSRelayManager.instance = new OBSRelayManager();
    }
    return OBSRelayManager.instance;
  }

  // ── Connection state subscriptions ──

  public subscribe(listener: (state: ConnectionState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  public subscribeStreaming(listener: (streaming: boolean) => void) {
    this.streamListeners.add(listener);
    listener(this._isStreaming);
    return () => this.streamListeners.delete(listener);
  }

  public subscribeSnapshot(listener: (snapshot: SessionSnapshot) => void) {
    this.snapshotListeners.add(listener);
    if (this._sessionSnapshot) listener(this._sessionSnapshot);
    return () => this.snapshotListeners.delete(listener);
  }

  public subscribePipelineUpdates(listener: (update: PipelineUpdate) => void) {
    this.pipelineListeners.add(listener);
    return () => this.pipelineListeners.delete(listener);
  }

  public subscribePipelineResults(listener: (result: PipelineResult) => void) {
    this.pipelineResultListeners.add(listener);
    return () => this.pipelineResultListeners.delete(listener);
  }

  public subscribeErrors(listener: (error: string) => void) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  public subscribeRTMP(listener: (snapshot: RTMPSnapshot) => void) {
    this.rtmpListeners.add(listener);
    if (this._rtmpSnapshot) listener(this._rtmpSnapshot);
    return () => this.rtmpListeners.delete(listener);
  }

  // ── Getters ──

  get isStreaming() { return this._isStreaming; }
  get sessionSnapshot() { return this._sessionSnapshot; }
  get rtmpSnapshot() { return this._rtmpSnapshot; }

  // ── Notifications ──

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  private setState(newState: ConnectionState) {
    if (this.state !== newState) {
      this.state = newState;
      this.notify();
    }
  }

  private setStreaming(streaming: boolean) {
    if (this._isStreaming !== streaming) {
      this._isStreaming = streaming;
      this.streamListeners.forEach((l) => l(streaming));
    }
  }

  // ── Relay WebSocket ──

  public async initRelay() {
    if (this.relayWs && (this.relayWs.readyState === WebSocket.OPEN || this.relayWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Fetch Clerk session token for WebSocket auth
    let sessionToken = "";
    try {
      // Clerk exposes the session token via the __session cookie or getToken()
      // We can fetch it from the Clerk-provided session endpoint
      const Clerk = (window as any).Clerk;
      if (Clerk?.session) {
        sessionToken = await Clerk.session.getToken() || "";
      }
    } catch (e) {
      console.warn("[relay] Could not get Clerk session token:", e);
    }

    const host = window.location.host;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    
    // Send session token as first subprotocol (server reads it for JWT verification)
    const protocols = sessionToken
      ? [sessionToken, "vaani-relay-v1"]
      : ["vaani-relay-v1"];
    
    this.relayWs = new WebSocket(`${protocol}//${host}/ws/relay`, protocols);

    this.relayWs.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "PING") {
          this.relayWs?.send(JSON.stringify({ type: "PONG" }));

        } else if (msg.type === "OBS_CREDENTIALS") {
          this.credentials = {
            host: msg.host,
            port: msg.port,
            password: msg.password,
          };
          this.connectOBS();

        } else if (msg.type === "CLOSE") {
          this.cleanup();

        } else if (msg.type === "SESSION_STARTED") {
          this.setStreaming(true);
          this._sessionSnapshot = msg;
          this.snapshotListeners.forEach((l) => l(msg));
          // Track RTMP status from session
          if (msg.rtmp) {
            this._rtmpSnapshot = msg.rtmp;
            this.rtmpListeners.forEach((l) => l(msg.rtmp));
          }
          // Start capturing audio
          this.startAudioCapture();

        } else if (msg.type === "SESSION_STOPPED") {
          this.setStreaming(false);
          this._sessionSnapshot = msg;
          this.snapshotListeners.forEach((l) => l(msg));
          // Clear RTMP status
          this._rtmpSnapshot = { active: false, channels: [] };
          this.rtmpListeners.forEach((l) => l(this._rtmpSnapshot!));
          this.stopAudioCapture();

        } else if (msg.type === "SESSION_SNAPSHOT") {
          this._sessionSnapshot = msg;
          this.snapshotListeners.forEach((l) => l(msg));
          // Update RTMP status from snapshot
          if (msg.rtmp) {
            this._rtmpSnapshot = msg.rtmp;
            this.rtmpListeners.forEach((l) => l(msg.rtmp));
          }

        } else if (msg.type === "PIPELINE_STAGE_UPDATE") {
          this.pipelineListeners.forEach((l) => l(msg));

        } else if (msg.type === "PIPELINE_RESULT") {
          this.pipelineResultListeners.forEach((l) => l(msg));

        } else if (msg.type === "PIPELINE_ERROR") {
          this.errorListeners.forEach((l) => l(msg.error));

        } else if (msg.type === "GO_LIVE_ERROR") {
          this.setStreaming(false);
          this.errorListeners.forEach((l) => l(msg.error));

        } else if (msg.type === "RTMP_ERROR") {
          this.errorListeners.forEach((l) => l(`RTMP: ${msg.error}`));

        } else if (msg.type === "RTMP_CHANNEL_ERROR") {
          this.errorListeners.forEach((l) => l(`RTMP Channel ${msg.channelId}: ${msg.error}`));
        }
      } catch (e) {
        console.error("Relay WS message error:", e);
      }
    };

    this.relayWs.onclose = () => {
      this.relayWs = null;
      // If streaming was active, stop capture
      if (this._isStreaming) {
        this.setStreaming(false);
        this.stopAudioCapture();
      }
    };
  }

  // ── OBS Connection ──

  private async connectOBS() {
    if (!this.credentials || this.isConnectingOBS) return;
    this.isConnectingOBS = true;
    this.setState("reconnecting");

    try {
      if (this.obsClient) {
        try { await this.obsClient.disconnect(); } catch (e) {} // ignore
      }

      await this.obsClient.connect(
        `ws://${this.credentials.host}:${this.credentials.port}`,
        this.credentials.password
      );

      this.isConnectingOBS = false;
      this.retryCount = 0;
      this.setState("connected");
      this.notifyRelay({ type: "OBS_CONNECTED" });
      
      // Hook up default disconnect handlers
      this.obsClient.once("ConnectionClosed", () => this.handleOBSDisconnect("CONNECTION_LOST"));
      this.obsClient.once("ConnectionError", () => this.handleOBSDisconnect("CONNECTION_ERROR"));
      
    } catch (err: any) {
      this.isConnectingOBS = false;
      let reason = "CONNECTION_ERROR";
      if (err?.code === 4009) reason = "AUTH_FAILED";
      this.handleOBSDisconnect(reason);
    }
  }

  private handleOBSDisconnect(reason: string) {
    if (this.state === "unconfigured") return;
    this.setState("disconnected");
    this.notifyRelay({ type: "OBS_DISCONNECTED", reason });

    if (this.retryCount < this.maxRetries) {
      this.setState("reconnecting");
      const delay = this.backoffDelays[this.retryCount];
      this.retryCount++;
      if (this.retryTimeout) clearTimeout(this.retryTimeout);
      this.retryTimeout = setTimeout(() => this.connectOBS(), delay);
    }
  }

  public retryNow() {
    this.retryCount = 0;
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.connectOBS();
  }

  // ── Go Live / Stop Stream ──

  public goLive() {
    if (!this.relayWs || this.relayWs.readyState !== WebSocket.OPEN) {
      this.errorListeners.forEach((l) => l("Not connected to server"));
      return;
    }
    this.relayWs.send(JSON.stringify({ type: "GO_LIVE" }));
  }

  public stopStream() {
    if (!this.relayWs || this.relayWs.readyState !== WebSocket.OPEN) return;
    this.relayWs.send(JSON.stringify({ type: "STOP_STREAM" }));
    this.stopAudioCapture();
  }

  // ── Audio Capture ──
  // Captures microphone audio (or system audio if browser supports it)
  // and sends chunks to the server every 3 seconds for pipeline processing.

  private async startAudioCapture() {
    try {
      // Try to get display media with audio (system audio for streaming)
      // Fall back to microphone if display media is not available
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: false,
        });
      } catch {
        // Fallback to microphone
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      }

      // Use webm/opus which is well supported
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 32000,
      });

      let audioChunks: Blob[] = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      // Send accumulated audio every 3 seconds as binary
      this.audioChunkInterval = setInterval(async () => {
        if (audioChunks.length > 0 && this._isStreaming) {
          const blob = new Blob(audioChunks, { type: mimeType });
          audioChunks = [];

          // Send as raw binary (ArrayBuffer) — ~33% smaller than Base64
          if (this.relayWs?.readyState === WebSocket.OPEN) {
            const arrayBuffer = await blob.arrayBuffer();
            this.relayWs.send(arrayBuffer);
          }
        }
      }, 3000);

      // Start recording in 3-second slices
      this.mediaRecorder.start(1000); // collect data every 1s, send every 3s
      console.log("[audio] Audio capture started");
    } catch (err) {
      console.error("[audio] Failed to start audio capture:", err);
      this.errorListeners.forEach((l) =>
        l("Failed to capture audio. Please allow microphone access.")
      );
    }
  }

  private stopAudioCapture() {
    if (this.audioChunkInterval) {
      clearInterval(this.audioChunkInterval);
      this.audioChunkInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
        // Stop all tracks
        this.mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      } catch (e) {
        // ignore
      }
      this.mediaRecorder = null;
    }
    console.log("[audio] Audio capture stopped");
  }

  // ── Relay Communication ──

  private notifyRelay(msg: any) {
    if (this.relayWs && this.relayWs.readyState === WebSocket.OPEN) {
      this.relayWs.send(JSON.stringify(msg));
    }
  }

  public cleanup() {
    this.credentials = null;
    this.setState("unconfigured");
    this.stopAudioCapture();
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    if (this.obsClient) {
      try { this.obsClient.disconnect(); } catch (e) {}
    }
    if (this.relayWs) {
      this.relayWs.close();
      this.relayWs = null;
    }
  }
}

export const obsRelayManager = OBSRelayManager.getInstance();
