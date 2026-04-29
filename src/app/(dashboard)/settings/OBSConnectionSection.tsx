"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, Loader2, AlertCircle, Trash2, X, Activity } from "lucide-react";
import OBSWebSocket from "obs-websocket-js";

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
      console.error("[settings] Failed to fetch OBS status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchObsStatus();
    // Poll for live status every 10 seconds if configured
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

    // Test client connection
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
    } catch (err) {
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
    } catch (err) {
      setActionState("error");
    }
  };

  if (loading) {
    return (
      <section className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_12px_40px_rgba(0,0,0,0.03)] rounded-[28px] overflow-hidden">
        <div className="px-8 py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      </section>
    );
  }

  const isConfigured = obsStatus?.configured;
  const isLive = obsStatus?.connected;

  return (
    <section className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_12px_40px_rgba(0,0,0,0.03)] rounded-[28px] overflow-hidden">
      <div className="px-8 pt-7 pb-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-syne font-bold text-gray-900">OBS Connection</h2>
          <p className="text-[12px] font-dm-sans text-gray-400 mt-0.5">Let Vaani connect to your broadcast software</p>
        </div>
        {isConfigured && sectionState === "view" && (
            <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 border ${isLive ? 'bg-[#F0FDF4] border-[#10B981]/20' : 'bg-gray-100 border-gray-200'}`}>
                {isLive ? <Activity className="w-3.5 h-3.5 text-[#10B981]" /> : <AlertCircle className="w-3.5 h-3.5 text-gray-500" />}
                <span className={`text-[12px] font-dm-sans font-medium ${isLive ? 'text-[#10B981]' : 'text-gray-500'}`}>{isLive ? "Connected to OBS" : "OBS Disconnected"}</span>
            </div>
        )}
      </div>

      <div className="px-8 py-6">
        {sectionState === "view" && isConfigured ? (
          <div>
             <div className="flex flex-col gap-1 mb-6 text-[13px] font-mono text-gray-600 bg-gray-50/50 p-4 rounded-[16px] border border-gray-100">
                 <div>Host: <span className="text-gray-900">{obsStatus.host}</span></div>
                 <div>Port: <span className="text-gray-900">{obsStatus.port}</span></div>
                 <div>Password: <span className="text-gray-900">{obsStatus.hasPassword ? "••••••••" : "None"}</span></div>
             </div>
             <div className="flex gap-3">
                 <button onClick={() => { setObsHost(obsStatus.host || "localhost"); setObsPort(obsStatus.port?.toString() || "4455"); setSectionState("edit"); }} className="px-6 py-3 rounded-[16px] text-[14px] font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-all">
                   Update Configuration
                 </button>
                 <button onClick={() => setShowDisconnectDialog(true)} className="px-6 py-3 rounded-[16px] text-[14px] font-semibold text-[#EF4444] bg-[#FEF2F2] border border-[#FEE2E2] hover:bg-[#FEE2E2] transition-all">
                   Disconnect OBS
                 </button>
             </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-[13px] font-dm-sans font-semibold text-gray-700">Host (IP or localhost)</label>
                <input value={obsHost} onChange={e => setObsHost(e.target.value)} type="text" placeholder="localhost" className="w-full rounded-[16px] border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-[13px] outline-none focus:border-[#F5821F]/40 focus:ring-2 focus:ring-[#F5821F]/15" />
              </div>
              <div className="w-[120px] space-y-2">
                <label className="text-[13px] font-dm-sans font-semibold text-gray-700">Port</label>
                <input value={obsPort} onChange={e => setObsPort(e.target.value)} type="number" placeholder="4455" className="w-full rounded-[16px] border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-[13px] outline-none focus:border-[#F5821F]/40 focus:ring-2 focus:ring-[#F5821F]/15" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-dm-sans font-semibold text-gray-700 block">Password <span className="text-gray-400 font-normal float-right">Leave blank if none</span></label>
              <input value={obsPassword} onChange={e => setObsPassword(e.target.value)} type="password" placeholder="OBS WebSocket password" className="w-full rounded-[16px] border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-[13px] font-mono outline-none focus:border-[#F5821F]/40 focus:ring-2 focus:ring-[#F5821F]/15" />
            </div>

            {errorCode && <div className="text-[12px] text-[#EF4444] font-dm-sans">{errorCode}</div>}

            <div className="flex gap-3 pt-2">
                <button disabled={!canSubmit} onClick={handleSave} className="px-6 py-3 rounded-[16px] text-[14px] font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-all flex items-center gap-2">
                    {actionState === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
                    {actionState === "success" && <Check className="w-4 h-4" />}
                    {actionState === "loading" ? "Saving..." : actionState === "success" ? "Saved!" : "Connect & Save"}
                </button>
                {isConfigured && (
                    <button onClick={() => { setSectionState("view"); setActionState("idle"); setErrorCode(null); }} className="px-5 py-2.5 rounded-[14px] text-[14px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">Cancel</button>
                )}
            </div>
          </div>
        )}
      </div>

       {showDisconnectDialog && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[8px] animate-[fade-in_150ms_ease]" />
          <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] bg-white/95 backdrop-blur-xl border border-white shadow-[0_32px_80px_rgba(0,0,0,0.12)] rounded-[28px] p-8">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-[20px] font-syne font-bold text-gray-900">Disconnect OBS?</h3>
              <button onClick={() => setShowDisconnectDialog(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[14px] font-dm-sans text-gray-500 leading-[1.6] mb-7">Vaani will disconnect from your broadcasting software. You can reconfigure this at any time.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDisconnectDialog(false)} className="px-5 py-2.5 rounded-[14px] text-[14px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100">Keep Connected</button>
              <button onClick={handleDisconnect} disabled={actionState === "loading"} className="px-6 py-3 rounded-[16px] text-[14px] font-semibold bg-[#EF4444] text-white hover:bg-[#DC2626] flex items-center gap-2">
                {actionState === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
