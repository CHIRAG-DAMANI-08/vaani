"use client";

import { useState, useEffect } from "react";
import { Mic } from "lucide-react";

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
  const [speaker, setSpeaker] = useState("shubh");
  const [pace, setPace] = useState(1.0);
  const [sourceLang, setSourceLang] = useState("auto");

  // Load from localStorage on mount
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
    // Best-effort sync to server
    try {
      import("@/lib/obs-relay-client").then((mod) => {
        const mgr = mod.obsRelayManager as any;
        if (typeof mgr.setTTSSettings === "function") {
          mgr.setTTSSettings({ speaker: newSpeaker, pace: newPace, sourceLang: newSourceLang });
        } else {
          // Fallback: send raw message via relay
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
    "w-full text-[14px] font-dm-sans bg-gray-50/80 border border-gray-100 rounded-[12px] px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all hover:bg-white";

  return (
    <section className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-[24px] overflow-hidden mb-6 relative group">
      <div className="p-6 md:p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="w-10 h-10 rounded-[12px] bg-[#8B5CF6]/10 flex items-center justify-center mb-4">
              <Mic className="w-5 h-5 text-[#8B5CF6]" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
            <div>
              <p className="text-[13px] font-dm-sans font-bold text-gray-700 mb-1">TTS Voice</p>
              <p className="text-[11px] text-gray-400 leading-snug">Speaker voice for translated audio.</p>
            </div>
            <div className="md:col-span-2">
              <select value={speaker} onChange={handleSpeakerChange} className={selectClass}>
                {SPEAKERS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
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
                {formatPaceLabel(pace)}
              </p>
            </div>
            <div className="md:col-span-2">
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={pace}
                onChange={handlePaceChange}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
            <div>
              <p className="text-[13px] font-dm-sans font-bold text-gray-700 mb-1">Source Language</p>
              <p className="text-[11px] text-gray-400 leading-snug">
                Lock input language for bilingual streams.
              </p>
            </div>
            <div className="md:col-span-2">
              <select value={sourceLang} onChange={handleSourceLangChange} className={selectClass}>
                {SOURCE_LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
