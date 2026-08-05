"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { Check, Loader2, AlertCircle, X, Activity } from "lucide-react";
import OBSWebSocket from "obs-websocket-js";
import { GlassCard } from "@/app/components/GlassCard";

type ObsStatus = {
  configured: boolean;
  connected?: boolean;
  host?: string;
  port?: number;
  hasPassword?: boolean;
  updatedAt?: string | null;
};

export function OBSConnectionSection({ 
    csrfToken, 
    refreshToken 
}: { 
    csrfToken: string; 
    refreshToken: () => void 
}) {
  const [obsStatus, setObsStatus] = useState<ObsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [sectionState, setSectionState] = useState<"view" | "edit">("view");
  const [actionState, setActionState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [obsHost, setObsHost] = useState("");
  const [obsPort, setObsPort] = useState("4455");
  const [obsPassword, setObsPassword] = useState("");

  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const fetchObsStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/obs/status");
      const data = await res.json();
      if (res.ok) {
        setObsStatus(data);
      }
    } catch (err) {
      logger.error({ err }, "OBS status fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchObsStatus();
    const interval = setInterval(() => {
       fetchObsStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchObsStatus]);

  const canSubmit = obsHost.trim() !== "" && parseInt(obsPort) >= 1024 && actionState !== "loading";

  const handleSave = async () => {
    if (!canSubmit) return;
    setActionState("loading");
    setErrorCode(null);

    const obsClient = new OBSWebSocket();
    try {
      await Promise.race([
        obsClient.connect(`ws://${obsHost.trim()}:${obsPort}`, obsPassword),
        new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 8000))
      ]);
      await obsClient.disconnect();
    } catch (err: any) {
      if (err?.code === 4009) {
        setErrorCode("OBS rejected the password. Check your WebSocket Server settings in OBS.");
      } else {
        setErrorCode("Couldn't reach OBS. Check OBS is open and WebSocket Server is enabled.");
      }
      setActionState("error");
      return;
    }

    try {
      const res = await fetch("/api/obs/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({ host: obsHost.trim(), port: parseInt(obsPort, 10), password: obsPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionState("success");
        setTimeout(() => {
          setSectionState("view");
          setActionState("idle");
          setObsPassword("");
          fetchObsStatus();
        }, 1000);
      } else {
        setErrorCode(data.error || "Internal Error");
        setActionState("error");
      }
    } catch {
      setErrorCode("Internal Error");
      setActionState("error");
    }
  };

  const handleDisconnect = async () => {
    setActionState("loading");
    try {
      const res = await fetch("/api/obs/credentials", {
        method: "DELETE",
        headers: { "x-csrf-token": csrfToken },
      });
      if (res.ok) {
        setShowDisconnectDialog(false);
        setActionState("idle");
        fetchObsStatus();
      } else {
        const data = await res.json();
        if (data.error === "CSRF_INVALID") refreshToken();
        setActionState("error");
      }
    } catch {
      setActionState("error");
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-8 flex justify-center items-center">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
      </GlassCard>
    );
  }

  const isConfigured = obsStatus?.configured;
  const isLive = obsStatus?.connected;

  return (
    <GlassCard className="flex flex-col h-full">
      {/* Card Header */}
      <div className="p-6 pb-4 border-b border-white/10 flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0">
            <Activity className="w-4 h-4" strokeWidth={1.6} />
          </div>
          <div>
            <h2 className="text-base font-sans font-bold text-white tracking-tight">OBS Connection</h2>
            <p className="text-xs font-sans text-neutral-400 mt-0.5">Connect to OBS WebSocket for live state and audio metering.</p>
          </div>
        </div>
        {isConfigured && sectionState === "view" && (
          <span className={`text-xs font-sans font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${
            isLive ? 'border-[#2DD4BF]/40 text-[#2DD4BF] bg-transparent' : 'border-white/15 text-neutral-400 bg-transparent'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#2DD4BF] animate-pulse' : 'bg-neutral-500'}`} />
            {isLive ? "Connected to OBS" : "OBS Disconnected"}
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="p-6">
        {sectionState === "view" && isConfigured ? (
          <div className="space-y-5">
             <div className="space-y-1.5 text-xs font-mono text-neutral-300 liquid-glass p-4 rounded-xl border border-white/10">
                 <div>Host: <span className="text-white">{obsStatus.host}</span></div>
                 <div>Port: <span className="text-white">{obsStatus.port}</span></div>
                 <div>Password: <span className="text-white">{obsStatus.hasPassword ? "••••••••" : "None"}</span></div>
             </div>
             <div className="flex items-center gap-3">
                 <button 
                   onClick={() => { setObsHost(obsStatus.host || "localhost"); setObsPort(obsStatus.port?.toString() || "4455"); setSectionState("edit"); }} 
                   className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-colors cursor-pointer"
                 >
                   Update Configuration
                 </button>
                 <button 
                   onClick={() => setShowDisconnectDialog(true)} 
                   className="px-4 py-2 rounded-full text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-950/30 transition-colors cursor-pointer"
                 >
                   Disconnect OBS
                 </button>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-sans font-semibold text-neutral-400 uppercase tracking-wider block">Host (IP or localhost)</label>
                <input 
                  value={obsHost} 
                  onChange={e => setObsHost(e.target.value)} 
                  type="text" 
                  placeholder="localhost" 
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-white/30 transition-all placeholder:text-neutral-600" 
                />
              </div>
              <div className="w-[110px] space-y-1.5">
                <label className="text-xs font-sans font-semibold text-neutral-400 uppercase tracking-wider block">Port</label>
                <input 
                  value={obsPort} 
                  onChange={e => setObsPort(e.target.value)} 
                  type="number" 
                  placeholder="4455" 
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-white/30 transition-all placeholder:text-neutral-600" 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-sans font-semibold text-neutral-400 uppercase tracking-wider flex justify-between items-center">
                <span>Password</span>
                <span className="text-[10px] text-neutral-500 font-normal">Leave blank if none</span>
              </label>
              <input 
                value={obsPassword} 
                onChange={e => setObsPassword(e.target.value)} 
                type="password" 
                placeholder="OBS WebSocket password" 
                className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-white/30 transition-all placeholder:text-neutral-600" 
              />
            </div>

            {errorCode && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs font-sans text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" strokeWidth={1.6} />
                <span>{errorCode}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
                <button 
                  disabled={!canSubmit} 
                  onClick={handleSave} 
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-2"
                >
                    {actionState === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {actionState === "success" && <Check className="w-3.5 h-3.5" strokeWidth={1.6} />}
                    {actionState === "loading" ? "Saving..." : actionState === "success" ? "Saved!" : "Connect & Save"}
                </button>
                {isConfigured && (
                    <button 
                      onClick={() => { setSectionState("view"); setActionState("idle"); setErrorCode(null); }} 
                      className="px-4 py-2 rounded-full text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                )}
            </div>
          </div>
        )}
      </div>

      {showDisconnectDialog && (
        <>
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md liquid-glass bg-black/95 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-sans font-bold text-white">Disconnect OBS?</h3>
              <button onClick={() => setShowDisconnectDialog(false)} className="p-1 rounded-lg text-neutral-400 hover:text-white"><X className="w-4 h-4" strokeWidth={1.6} /></button>
            </div>
            <p className="text-xs font-sans text-neutral-400 leading-relaxed">Vaani will disconnect from your broadcasting software. You can reconfigure this at any time.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowDisconnectDialog(false)} className="px-4 py-2 rounded-full text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10">Keep Connected</button>
              <button onClick={handleDisconnect} disabled={actionState === "loading"} className="px-4 py-2 rounded-full text-xs font-semibold bg-red-500 text-white hover:bg-red-600 flex items-center gap-2">
                {actionState === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </GlassCard>
  );
}
