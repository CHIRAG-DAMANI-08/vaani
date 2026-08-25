"use client";

import { useState, useEffect, useCallback } from "react";
import { SpeakerHigh } from "@phosphor-icons/react";
import { Select } from "@/components/ui/Select";
import { useCSRF } from "@/lib/use-csrf";

interface TTSSettings {
  speaker: string;
  pace: number;
  sourceLang: string;
}

const SPEAKERS = [
  { value: "shubh", label: "Shubh — Male (Default)" },
  { value: "anushka", label: "Anushka — Female" },
  { value: "manisha", label: "Manisha — Female (Soft)" },
  { value: "vidya", label: "Vidya — Female (Clear)" },
  { value: "arjun", label: "Arjun — Male (Deep)" },
  { value: "arvind", label: "Arvind — Male (Formal)" },
  { value: "amol", label: "Amol — Male (Casual)" },
  { value: "amartya", label: "Amartya — Male (Warm)" },
];

const SOURCE_LANGUAGES = [
  { value: "auto", label: "Auto-detect" },
  { value: "en-IN", label: "English" },
  { value: "hi-IN", label: "Hindi" },
  { value: "ta-IN", label: "Tamil" },
  { value: "te-IN", label: "Telugu" },
  { value: "mr-IN", label: "Marathi" },
  { value: "bn-IN", label: "Bengali" },
  { value: "kn-IN", label: "Kannada" },
  { value: "ml-IN", label: "Malayalam" },
  { value: "gu-IN", label: "Gujarati" },
  { value: "pa-IN", label: "Punjabi" },
];

function formatPaceLabel(pace: number) {
  if (pace < 0.9) return `${pace.toFixed(1)}× Slower`;
  if (pace > 1.1) return `${pace.toFixed(1)}× Faster`;
  return `${pace.toFixed(1)}× Normal`;
}

export function TTSSettingsSection() {
  const [settings, setSettings] = useState<TTSSettings | undefined>(undefined);
  const { csrfToken } = useCSRF();

  // Load from cloud API on mount
  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const res = await fetch("/api/tts-settings");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setSettings({
              speaker: data.speaker,
              pace: data.pace,
              sourceLang: data.sourceLang,
            });
          }
        }
      } catch (err) {
        console.error("[tts-settings] Failed to load settings:", err);
      }
    }
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist to cloud API
  const saveSettings = useCallback(
    async (newSettings: TTSSettings) => {
      if (!csrfToken) return;
      try {
        await fetch("/api/tts-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify(newSettings),
        });
      } catch (err) {
        console.error("[tts-settings] Failed to save settings:", err);
      }

      // Best-effort real-time sync via WebSocket
      try {
        const mod = await import("@/lib/obs-relay-client");
        const mgr = mod.obsRelayManager as any;
        mgr.setTTSSettings?.(newSettings);
      } catch {
        // Non-critical
      }
    },
    [csrfToken]
  );

  const handleSpeakerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    const updated = { speaker: v, pace: settings?.pace ?? 1.0, sourceLang: settings?.sourceLang ?? "auto" };
    setSettings(updated);
    saveSettings(updated);
  };

  const handlePaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    const updated = { speaker: settings?.speaker ?? "shubh", pace: v, sourceLang: settings?.sourceLang ?? "auto" };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleSourceLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    const updated = { speaker: settings?.speaker ?? "shubh", pace: settings?.pace ?? 1.0, sourceLang: v };
    setSettings(updated);
    saveSettings(updated);
  };

  // Loading skeleton while API responds
  if (!settings) {
    return (
      <section className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-[24px] overflow-hidden mb-6 relative group">
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between mb-8">
            <div className="animate-pulse">
              <div className="w-10 h-10 rounded-[12px] bg-gray-100 mb-4" />
              <div className="h-6 w-40 bg-gray-100 rounded mb-2" />
              <div className="h-4 w-64 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="space-y-6 max-w-2xl animate-pulse">
            <div className="h-12 bg-gray-100 rounded-[12px]" />
            <div className="h-px bg-gray-100" />
            <div className="h-16 bg-gray-100 rounded-[12px]" />
            <div className="h-px bg-gray-100" />
            <div className="h-12 bg-gray-100 rounded-[12px]" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-[24px] overflow-hidden mb-6 relative group">
      <div className="p-6 md:p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="w-10 h-10 rounded-[12px] bg-[#8B5CF6]/10 flex items-center justify-center mb-4">
              <SpeakerHigh className="w-5 h-5 text-[#8B5CF6]" weight="bold" />
            </div>
            <h2 className="text-[20px] font-syne font-bold text-gray-900 mb-2">
              Voice &amp; Language
            </h2>
            <p className="text-[14px] font-dm-sans text-gray-500 max-w-xl">
              Configure TTS voice, speed, and source language detection.
            </p>
          </div>
        </div>

        <div className="space-y-6 max-w-2xl">
          {/* TTS Speaker */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-start">
            <div className="md:col-span-1">
              <p className="text-[13px] font-dm-sans font-bold text-gray-700 mb-1">TTS Voice</p>
              <p className="text-[11px] text-gray-400 leading-snug">Speaker voice for translated audio.</p>
            </div>
            <div className="md:col-span-2">
              <Select
                label="TTS Voice"
                value={settings.speaker}
                onChange={handleSpeakerChange}
                options={SPEAKERS}
                className="text-[14px]"
              />
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full" />

          {/* Pace */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-start">
            <div>
              <p className="text-[13px] font-dm-sans font-bold text-gray-700 mb-1">
                Speaking Pace
              </p>
              <p className="text-[11px] text-gray-400 leading-snug">
                {formatPaceLabel(settings.pace)}
              </p>
            </div>
            <div className="md:col-span-2">
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={settings.pace}
                onChange={handlePaceChange}
                aria-label="Speaking pace"
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#F5821F]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
                <span>0.5× Slow</span>
                <span>1.0× Normal</span>
                <span>2.0× Fast</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full" />

          {/* Source Language */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-start">
            <div className="md:col-span-1">
              <p className="text-[13px] font-dm-sans font-bold text-gray-700 mb-1">Source Language</p>
              <p className="text-[11px] text-gray-400 leading-snug">
                Lock input language for bilingual streams.
              </p>
            </div>
            <div className="md:col-span-2">
              <Select
                label="Source Language"
                value={settings.sourceLang}
                onChange={handleSourceLangChange}
                options={SOURCE_LANGUAGES}
                className="text-[14px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
