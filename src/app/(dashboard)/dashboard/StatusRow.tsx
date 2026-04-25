"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

type ChannelStatus = "live" | "ready" | "error" | "setup";

type ChannelData = {
  id: string;
  name: string;
  script: string;
  color: string;
  enabled: boolean;
  configured: boolean;
};

const SUPPORTED_LANGUAGES = [
  { id: "hi", name: "Hindi", script: "हिन्दी", color: "var(--lang-hindi)" },
  { id: "ta", name: "Tamil", script: "தமிழ்", color: "var(--lang-tamil)" },
  { id: "te", name: "Telugu", script: "తెలుగు", color: "var(--lang-telugu)" },
  { id: "mr", name: "Marathi", script: "मराठी", color: "var(--lang-marathi)" },
];

function StatusBadge({ status }: { status: ChannelStatus }) {
  const config = {
    live: { bg: "bg-[#10B981] text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)]", label: "Live" },
    ready: { bg: "bg-gray-100 text-gray-500", label: "Ready" },
    error: { bg: "bg-[#EF4444] text-white shadow-[0_4px_12px_rgba(239,68,68,0.25)]", label: "Error" },
    setup: { bg: "bg-transparent text-gray-400 border border-gray-200 border-dashed", label: "Setup" },
  };
  const c = config[status];
  return (
    <span className={`text-[11px] font-dm-sans font-bold px-3 py-1.5 rounded-[10px] ${c.bg}`}>
      {status === "live" && (
        <span className="relative flex h-[5px] w-[5px] inline-block mr-1.5 -top-[1px]">
          <span className="animate-[live-pulse_1.8s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-[5px] w-[5px] bg-white" />
        </span>
      )}
      {c.label}
    </span>
  );
}

export function StatusRow() {
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeLanguages, setActiveLanguages] = useState<string[]>([]);
  const [rtmpStatuses, setRtmpStatuses] = useState<Record<string, string>>({});

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels);
      } else {
        // Fallback to defaults
        setChannels(SUPPORTED_LANGUAGES.map(l => ({ ...l, configured: false, enabled: false })));
      }
    } catch {
      // Fallback to defaults
      setChannels(SUPPORTED_LANGUAGES.map(l => ({ ...l, configured: false, enabled: false })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();

    // Subscribe to streaming state for live badges
    import("@/lib/obs-relay-client").then((mod) => {
      const unsubStream = mod.obsRelayManager.subscribeStreaming((streaming) => {
        setIsStreaming(streaming);
      });

      const unsubSnapshot = mod.obsRelayManager.subscribeSnapshot((snapshot) => {
        if (snapshot.stats) {
          // activeLanguages count tells us which channels are live,
          // but we need the actual language list — check stages
          // For now mark all enabled channels as live if streaming
        }
      });

      // Subscribe to RTMP channel statuses
      const unsubRTMP = mod.obsRelayManager.subscribeRTMP((rtmpSnap) => {
        const statuses: Record<string, string> = {};
        for (const ch of rtmpSnap.channels) {
          statuses[ch.languageId] = ch.status;
        }
        setRtmpStatuses(statuses);
      });

      return () => {
        unsubStream();
        unsubSnapshot();
        unsubRTMP();
      };
    });
  }, [fetchChannels]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-4">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        <p className="text-[13px] text-gray-400 font-dm-sans">
          Loading channels...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[24px]">
      {channels.map((ch) => {
        // Determine status: use RTMP status if available, otherwise infer from streaming state
        let status: ChannelStatus = "setup";
        const rtmpStatus = rtmpStatuses[ch.id];

        if (isStreaming && ch.configured && ch.enabled) {
          if (rtmpStatus === "live") {
            status = "live";
          } else if (rtmpStatus === "error") {
            status = "error";
          } else if (rtmpStatus === "connecting") {
            status = "ready"; // Show as "Ready" while connecting
          } else {
            status = "live"; // Default to live for pipeline-only mode (no RTMP configured)
          }
        } else if (ch.configured && ch.enabled) {
          status = "ready";
        } else if (ch.configured && !ch.enabled) {
          status = "setup";
        }

        // Deep rich card styling
        const liveStyles = status === "live" ? {
          background: "linear-gradient(145deg, #ffffff 0%, rgba(255,255,255,0.85) 100%)",
          boxShadow: `
            0 12px 40px rgba(0,0,0,0.06), 
            0 2px 10px rgba(0,0,0,0.02),
            inset 0 4px 20px color-mix(in srgb, ${ch.color} 8%, transparent)
          `,
          borderColor: "rgba(255,255,255,1)"
        } : {
           background: "rgba(255,255,255,0.85)"
        };

        return (
          <div
            key={ch.id}
            className="rounded-[28px] p-[24px] border border-white flex flex-col transition-all duration-400 ease-in-out hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] shadow-[0_8px_24px_rgba(0,0,0,0.03)] backdrop-blur-3xl"
            style={liveStyles}
          >
            {/* Identity & Badge */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-[16px] bg-white shadow-sm flex items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 opacity-10 blur-md" style={{ backgroundColor: ch.color }} />
                 <span className="text-[20px] font-sans font-bold text-gray-800 z-10" style={{ color: status === "live" ? ch.color : undefined }}>
                   {ch.script.charAt(0)}
                 </span>
              </div>
              <StatusBadge status={status} />
            </div>

            <div className="mt-6 mb-1">
               <p className="text-[22px] font-syne font-bold text-gray-900 leading-none mb-1">
                  {ch.script}
                </p>
                <p className="text-[14px] font-dm-sans font-medium text-gray-500">
                  {ch.name}
                </p>
            </div>

            {/* Sub Metrics */}
            <div className="mt-8 pt-4 border-t border-[rgba(0,0,0,0.04)]">
              {status === "live" ? (
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-dm-sans font-bold text-gray-600">Streaming</p>
                  <div className="flex gap-[3px] items-center">
                    <div className="w-[4px] h-[12px] bg-[#10B981] rounded-full animate-pulse" />
                    <div className="w-[4px] h-[8px] bg-[#10B981] rounded-full animate-pulse delay-75" />
                    <div className="w-[4px] h-[16px] bg-[#10B981] rounded-full animate-pulse delay-150" />
                  </div>
                </div>
              ) : status === "setup" ? (
                <Link href="/channels" className="flex items-center justify-between group cursor-pointer">
                  <p className="text-[13px] font-dm-sans font-medium text-gray-400">
                    {ch.configured ? "Paused" : "Not configured"}
                  </p>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#FFF2E5] group-hover:text-[#F5821F] text-gray-400 transition-colors">
                     <span className="font-serif text-[18px] leading-none mb-0.5">→</span>
                  </div>
                </Link>
              ) : (
                <p className="text-[13px] font-dm-sans font-medium text-gray-400">Ready to stream</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
