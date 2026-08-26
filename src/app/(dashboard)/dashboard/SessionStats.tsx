"use client";

import { useState, useEffect } from "react";
import { Clock, CurrencyInr, Stack, Globe, Lightning } from "@phosphor-icons/react";
import { GlassCard } from "@/app/components/GlassCard";

export function SessionStats() {
  const [duration, setDuration] = useState("—");
  const [cost, setCost] = useState("—");
  const [chunks, setChunks] = useState("—");
  const [languages, setLanguages] = useState("—");
  const [latency, setLatency] = useState("—");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    let unsubStream: (() => void) | undefined;
    let unsubSnapshot: (() => void) | undefined;

    import("@/lib/obs-relay-client").then((mod) => {
      unsubStream = mod.obsRelayManager.subscribeStreaming((streaming) => {
        setIsStreaming(streaming);
      });

      unsubSnapshot = mod.obsRelayManager.subscribeSnapshot((snapshot) => {
        if (snapshot.stats) {
          setCost(`₹${snapshot.stats.estimatedCostINR.toFixed(2)}`);
          setChunks(String(snapshot.stats.chunksProcessed));
          setLanguages(String(snapshot.stats.activeLanguages));

          if (snapshot.stats.avgLatencyMs > 0) {
            setLatency(`${(snapshot.stats.avgLatencyMs / 1000).toFixed(1)}s`);
          } else {
            setLatency("—");
          }

          if (snapshot.active) {
            setDuration(snapshot.stats.durationFormatted);
          }
        }
      });
    });

    return () => {
      unsubStream?.();
      unsubSnapshot?.();
    };
  }, []);

  const stats = [
    { label: "Duration", value: isStreaming ? duration : "—", icon: Clock },
    { label: "API Cost", value: isStreaming ? cost : "—", icon: CurrencyInr },
    { label: "Chunks", value: isStreaming ? chunks : "—", icon: Stack },
    { label: "Languages", value: isStreaming ? languages : "—", icon: Globe },
    { label: "Latency", value: isStreaming ? latency : "—", icon: Lightning },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {stats.map((s, idx) => (
        <GlassCard 
          key={s.label} 
          delay={idx * 0.05}
          className="p-5 flex flex-col justify-between relative overflow-hidden min-h-[140px]"
        >
          {/* Large faded icon watermark */}
          <s.icon className="absolute -right-3 -top-3 w-20 h-20 text-white/[0.04] pointer-events-none" />

          {/* Icon tile */}
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white mb-3">
            <s.icon className="w-4 h-4" />
          </div>

          <div>
            <p className="text-[10px] tracking-[2.5px] font-sans font-semibold text-neutral-400 uppercase mb-1">
              {s.label}
            </p>
            <p className={`text-2xl font-serif italic text-white ${isStreaming && s.value !== '—' ? '' : 'text-neutral-500'}`}>
              {s.value}
            </p>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
