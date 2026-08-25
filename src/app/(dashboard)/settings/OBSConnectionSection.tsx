"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, SpinnerGap, WarningCircle, Pulse } from "@phosphor-icons/react";
import OBSWebSocket from "obs-websocket-js";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

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
        <div className="px-8 py-10 flex justify-center"><SpinnerGap className="w-5 h-5 animate-spin text-gray-400" weight="bold" /></div>
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
                {isLive ? <Pulse className="w-3.5 h-3.5 text-[#10B981]" weight="bold" /> : <WarningCircle className="w-3.5 h-3.5 text-gray-500" weight="bold" />}
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
                 <Button variant="secondary" size="lg" onClick={() => { setObsHost(obsStatus.host?.replace(/^.*:\/\//, "") || "localhost"); setObsPort(obsStatus.port?.toString() || "4455"); setSectionState("edit"); }}>
                   Update Configuration
                 </Button>
                 <Button variant="danger" size="lg" onClick={() => setShowDisconnectDialog(true)}>
                   Disconnect OBS
                 </Button>
             </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  label="OBS Host"
                  value={obsHost}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObsHost(e.target.value)}
                  type="text"
                  placeholder="localhost"
                  hint="IP address or localhost"
                />
              </div>
              <div className="w-[120px]">
                <Input
                  label="Port"
                  value={obsPort}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObsPort(e.target.value)}
                  type="number"
                  placeholder="4455"
                />
              </div>
            </div>
            <Input
              label="Password"
              value={obsPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObsPassword(e.target.value)}
              type="password"
              placeholder="OBS WebSocket password"
              hint="Leave blank if your OBS WebSocket server has no password set"
            />

            {errorCode && <div className="text-[12px] text-[#EF4444] font-dm-sans">{errorCode}</div>}

            <div className="flex gap-3 pt-2">
                <Button variant="primary" size="lg" disabled={!canSubmit} loading={actionState === "loading"} icon={actionState === "success" ? Check : undefined} onClick={handleSave}>
                    {actionState === "loading" ? "Saving..." : actionState === "success" ? "Saved!" : "Connect & Save"}
                </Button>
                {isConfigured && (
                    <Button variant="ghost" size="md" onClick={() => { setSectionState("view"); setActionState("idle"); setErrorCode(null); }}>
                      Cancel
                    </Button>
                )}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={showDisconnectDialog}
        onClose={() => setShowDisconnectDialog(false)}
        title="Disconnect OBS?"
        description="Vaani will disconnect from your broadcasting software. You can reconfigure this at any time."
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setShowDisconnectDialog(false)}>
              Keep Connected
            </Button>
            <Button variant="danger" size="lg" loading={actionState === "loading"} onClick={handleDisconnect}>
              Disconnect
            </Button>
          </>
        }
      >
        {/* Body intentionally empty — context provided via description prop */}
      </Modal>
    </section>
  );
}
