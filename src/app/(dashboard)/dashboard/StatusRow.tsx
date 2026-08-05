"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";
import { LANGUAGE_REGISTRY } from "@/lib/language-registry";
import { GlassCard } from "@/app/components/GlassCard";

type ChannelStatus = "live" | "ready" | "error" | "setup";

type ChannelData = {
  id: string;
  name: string;
  script: string;
  color: string;
  enabled: boolean;
  configured: boolean;
};

const SUPPORTED_LANGUAGES = LANGUAGE_REGISTRY.map((l) => ({
  id: l.id,
  name: l.name,
  script: l.nativeName || l.name,
  color: `var(--lang-${l.name.toLowerCase()}, #2DD4BF)`,
}));

function StatusBadge({ status }: { status: ChannelStatus }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-[#2DD4BF]/40 text-[#2DD4BF] bg-transparent shadow-[0_0_10px_rgba(45,212,191,0.15)]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2DD4BF] opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#2DD4BF]" />
        </span>
        Live
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-[#2DD4BF]/40 text-[#2DD4BF] bg-transparent">
        <span className="relative flex h-1.5 w-1.5">
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#2DD4BF]" />
        </span>
        Ready
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-red-500/40 text-red-400 bg-transparent">
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-white/15 text-neutral-400 bg-transparent">
      Setup
    </span>
  );
}

export function StatusRow() {
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [rtmpStatuses, setRtmpStatuses] = useState<Record<string, string>>({});

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        const apiChannels: any[] = Array.isArray(data.channels)
          ? data.channels
          : Array.isArray(data)
          ? data
          : [];

        if (apiChannels.length > 0) {
          const apiChannelsMap = new Map(
            apiChannels.map((c: any) => [c.id || c.languageId, c])
          );
          const merged = SUPPORTED_LANGUAGES.map((l) => {
            const apiCh = apiChannelsMap.get(l.id) as any;
            return {
              id: l.id,
              name: l.name,
              script: l.script || apiCh?.script || apiCh?.languageName || l.name,
              color: l.color,
              enabled: apiCh ? !!apiCh.enabled : l.id === "hi",
              configured: apiCh ? !!apiCh.configured : l.id === "hi",
            };
          });
          setChannels(merged);
        } else {
          setChannels(
            SUPPORTED_LANGUAGES.map((l) => ({
              ...l,
              configured: l.id === "hi",
              enabled: l.id === "hi",
            }))
          );
        }
      } else {
        setChannels(
          SUPPORTED_LANGUAGES.map((l) => ({
            ...l,
            configured: l.id === "hi",
            enabled: l.id === "hi",
          }))
        );
      }
    } catch {
      setChannels(
        SUPPORTED_LANGUAGES.map((l) => ({
          ...l,
          configured: l.id === "hi",
          enabled: l.id === "hi",
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();

    import("@/lib/obs-relay-client").then((mod) => {
      const unsubStream = mod.obsRelayManager.subscribeStreaming(
        (streaming) => {
          setIsStreaming(streaming);
        }
      );

      const unsubRTMP = mod.obsRelayManager.subscribeRTMP((rtmpSnap) => {
        const statuses: Record<string, string> = {};
        for (const ch of rtmpSnap.channels) {
          statuses[ch.languageId] = ch.status;
        }
        setRtmpStatuses(statuses);
      });

      return () => {
        unsubStream();
        unsubRTMP();
      };
    });
  }, [fetchChannels]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12">
        <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
        <p className="text-xs text-neutral-400 font-sans">
          Loading language channels...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      {channels.map((ch, idx) => {
        let status: ChannelStatus = "setup";
        const rtmpStatus = rtmpStatuses[ch.id];

        if (isStreaming && ch.configured && ch.enabled) {
          if (rtmpStatus === "live") {
            status = "live";
          } else if (rtmpStatus === "error") {
            status = "error";
          } else {
            status = "live";
          }
        } else if (ch.configured && ch.enabled) {
          status = "ready";
        } else if (ch.configured && !ch.enabled) {
          status = "setup";
        } else if (ch.id === "hi") {
          status = "ready";
        }

        const displayScript = ch.script || ch.name || "A";
        const firstChar = displayScript.charAt(0);

        return (
          <GlassCard key={ch.id} delay={idx * 0.05} className="min-h-[220px] flex flex-col p-5">
            {/* Top row: glyph tile + status badge */}
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-sans font-bold text-lg text-white">
                {firstChar}
              </div>
              <StatusBadge status={status} />
            </div>

            {/* Middle row: Native script in Instrument Serif ~3xl + English name */}
            <div className="my-auto pt-4 pb-2">
              <h3 className="font-serif italic text-3xl font-normal text-white leading-tight tracking-tight">
                {displayScript}
              </h3>
              <p className="text-sm font-sans text-neutral-400 mt-1">
                {ch.name || ch.id}
              </p>
            </div>

            {/* Footer separated by hairline border */}
            <div className="pt-3 mt-auto border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-sans font-medium text-neutral-400">
                {status === "live"
                  ? "Streaming live"
                  : status === "ready"
                  ? "Ready to stream"
                  : "Not configured"}
              </span>
              <Link
                href="/channels"
                className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 group-hover:text-white group-hover:bg-white/15 transition-all"
              >
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.6} />
              </Link>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
