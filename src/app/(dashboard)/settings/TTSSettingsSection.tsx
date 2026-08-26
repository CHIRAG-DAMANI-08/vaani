"use client";

import { useState, useEffect } from "react";
import { Microphone } from "@phosphor-icons/react";
import { GlassCard } from "@/app/components/GlassCard";

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
  const [speaker, setSpeaker] = useState("shubh");
  const [pace, setPace] = useState(1.0);
  const [sourceLang, setSourceLang] = useState("auto");

  useEffect(() => {
    const savedSpeaker = localStorage.getItem("vaani_tts_speaker");
    const savedPace = localStorage.getItem("vaani_tts_pace");
    const savedSourceLang = localStorage.getItem("vaani_source_lang");
    if (savedSpeaker) setSpeaker(savedSpeaker);
    if (savedPace) setPace(parseFloat(savedPace));
    if (savedSourceLang) setSourceLang(savedSourceLang);
  }, []);

  const saveAndSync = (newSpeaker: string, newPace: number, newSourceLang: string) => {
    localStorage.setItem("vaani_tts_speaker", newSpeaker);
    localStorage.setItem("vaani_tts_pace", String(newPace));
    localStorage.setItem("vaani_source_lang", newSourceLang);
    try {
      import("@/lib/obs-relay-client").then((mod) => {
        const mgr = mod.obsRelayManager as any;
        if (typeof mgr.setTTSSettings === "function") {
          mgr.setTTSSettings({ speaker: newSpeaker, pace: newPace, sourceLang: newSourceLang });
        } else {
          const ws = mgr.relayWs;
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "SET_TTS_SETTINGS",
              speaker: newSpeaker,
              pace: newPace,
              sourceLang: newSourceLang,
            }));
          }
        }
      });
    } catch {
      // Non-critical
    }
  };

  const handleSpeakerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setSpeaker(v);
    saveAndSync(v, pace, sourceLang);
  };

  const handlePaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setPace(v);
    saveAndSync(speaker, v, sourceLang);
  };

  const handleSourceLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setSourceLang(v);
    saveAndSync(speaker, pace, v);
  };

  const selectClass =
    "w-full text-xs font-sans bg-white/[0.02] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-white/30 transition-all cursor-pointer";

  return (
    <GlassCard className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0">
            <Microphone className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-sans font-bold text-white tracking-tight">Voice &amp; Language</h2>
            <p className="text-xs font-sans text-neutral-400 mt-0.5">Configure TTS voice speaker, speed, and language detection.</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* TTS Voice Row */}
        <div className="space-y-1.5">
          <label className="text-xs font-sans font-semibold text-neutral-400 uppercase tracking-wider block">
            TTS Voice Speaker
          </label>
          <select value={speaker} onChange={handleSpeakerChange} className={selectClass}>
            {SPEAKERS.map((s) => (
              <option key={s.value} value={s.value} className="bg-neutral-900 text-white">{s.label}</option>
            ))}
          </select>
        </div>


        {/* Pace / Speed Slider */}
        <div className="h-px bg-white/10" />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-sans font-semibold text-neutral-400 uppercase tracking-wider">
              Speech Pace
            </label>
            <span className="text-xs font-sans font-medium text-white tabular-nums">
              {formatPaceLabel(pace)}
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={pace}
            onChange={handlePaceChange}
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />
          <p className="text-[11px] font-sans text-neutral-500">
            Adjusts how fast the translated speech is spoken.
          </p>
        </div>

        <div className="h-px bg-white/10" />

        {/* Source Language Row */}
        <div className="space-y-1.5">
          <label className="text-xs font-sans font-semibold text-neutral-400 uppercase tracking-wider block">
            Source Language Lock
          </label>
          <select value={sourceLang} onChange={handleSourceLangChange} className={selectClass}>
            {SOURCE_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value} className="bg-neutral-900 text-white">{l.label}</option>
            ))}
          </select>
        </div>
      </div>
    </GlassCard>
  );
}
