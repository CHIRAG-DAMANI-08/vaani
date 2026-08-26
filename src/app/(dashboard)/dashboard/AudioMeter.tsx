"use client";

import { useState, useEffect } from "react";
import type { AudioLevel } from "@/lib/obs-relay-client";
import { Tooltip } from "@/app/components/Tooltip";

const VAD_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  speech: { label: "Speech", emoji: "🎤", color: "#10B981" },
  silent: { label: "Silent", emoji: "🔇", color: "#9CA3AF" },
  noise: { label: "Noise", emoji: "🔊", color: "#F59E0B" },
};

export function AudioMeter() {
  const [level, setLevel] = useState<AudioLevel>({
    rms: 0, zcr: 0, vadStatus: "silent", bufferPercent: 0,
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let unsubLevel: (() => void) | null = null;
    let unsubStream: (() => void) | null = null;

    import("@/lib/obs-relay-client").then((mod) => {
      unsubLevel = mod.obsRelayManager.subscribeAudioLevel((l) => {
        setLevel(l);
      });
      unsubStream = mod.obsRelayManager.subscribeStreaming((streaming) => {
        setIsConnected(streaming);
        if (!streaming) {
          setLevel({ rms: 0, zcr: 0, vadStatus: "silent", bufferPercent: 0 });
        }
      });
    });

    return () => {
      unsubLevel?.();
      unsubStream?.();
    };
  }, []);

  if (!isConnected) return null;

  const vad = VAD_LABELS[level.vadStatus] || VAD_LABELS.silent;
  // Normalize RMS to 0-100 for the bar. RMS max for 16-bit is 32768, but speech is typically 200-5000.
  const normalizedRms = Math.min(100, Math.round((level.rms / 5000) * 100));

  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <p className="text-[12px] font-sans font-bold text-neutral-500 uppercase tracking-wider mb-3">
        Audio Input
      </p>

      {/* Audio Level Bar */}
      <div className="relative h-[6px] w-full rounded-full bg-white/10 overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-150 ease-out"
          style={{
            width: `${normalizedRms}%`,
            backgroundColor: vad.color,
            boxShadow: normalizedRms > 30 ? `0 0 8px ${vad.color}40` : "none",
          }}
        />
        {/* Peak markers */}
        {[25, 50, 75].map((mark) => (
          <div
            key={mark}
            className="absolute top-0 bottom-0 w-px bg-white/15"
            style={{ left: `${mark}%` }}
          />
        ))}
      </div>

      {/* VAD Status + RMS value */}
      <div className="flex items-center justify-between">
        <Tooltip 
          content="Voice Activity Detection (VAD) identifies when you are speaking. Vaani only translates chunks marked as Speech to save costs."
          position="right"
        >
          <span
            className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold px-2 py-0.5 rounded-md transition-colors duration-200 cursor-help"
            style={{
              backgroundColor: `${vad.color}15`,
              color: vad.color,
            }}
          >
            {vad.emoji} {vad.label}
          </span>
        </Tooltip>

        <Tooltip 
          content="RMS (Root Mean Square) is your audio volume. ZCR (Zero-Crossing Rate) helps detect speech vs. background noise."
          position="left"
        >
          <span className="text-[10px] font-mono text-neutral-400 cursor-help border-b border-dashed border-white/20">
            RMS {level.rms}
          </span>
        </Tooltip>
      </div>

      {/* Buffer Progress */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-neutral-500">Buffer</span>
          <span className="text-[10px] font-mono text-neutral-400">{level.bufferPercent}%</span>
        </div>
        <div className="h-[3px] w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${level.bufferPercent}%`,
              backgroundColor: level.bufferPercent >= 80 ? "#10B981" : level.bufferPercent >= 40 ? "#F59E0B" : "#9CA3AF",
            }}
          />
        </div>
      </div>
    </div>
  );
}
