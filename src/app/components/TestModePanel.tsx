"use client";

// Refreshed SSR safe component - Model & Speaker mapped
import { useState, useEffect, useRef } from "react";
import { Flask, Play, Pause, CircleNotch, WarningCircle, CaretDown, CaretUp, Microphone } from "@phosphor-icons/react";
import { LANGUAGE_REGISTRY } from "@/lib/language-registry";
import { GlassCard } from "@/app/components/GlassCard";
import { useCSRF } from "@/lib/use-csrf";

const PRESETS = [
  "Hello, welcome to my stream!",
  "Today we're playing a new game.",
  "Thanks for the raid!",
  "GG, that was a great match.",
  "Donation received — thank you!",
];

// Valid bulbul:v3 speakers (v1 voices like arjun/anushka were retired).
const VOICE_SPEAKERS = [
  { id: "shubh", name: "Shubh", gender: "Male" },
  { id: "ritu", name: "Ritu", gender: "Female" },
  { id: "kavya", name: "Kavya", gender: "Female" },
  { id: "aditya", name: "Aditya", gender: "Male" },
  { id: "priya", name: "Priya", gender: "Female" },
  { id: "rahul", name: "Rahul", gender: "Male" },
  { id: "tanya", name: "Tanya", gender: "Female" },
  { id: "tarun", name: "Tarun", gender: "Male" },
];

type TestResult = {
  languageId: string;
  translatedText: string;
  audioBase64: string;
  speaker?: string;
};

type TestTimings = {
  translate: number;
  tts: number;
  total: number;
};

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function TestModePanel() {
  const [text, setText] = useState("");
  const availableLangs = LANGUAGE_REGISTRY.map((l) => ({
    id: l.id,
    name: l.name,
    flag: l.flag,
  }));

  const [selectedLangs, setSelectedLangs] = useState<string[]>(() => {
    const first = LANGUAGE_REGISTRY[0];
    return first ? [first.id] : [];
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [timings, setTimings] = useState<TestTimings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("shubh");
  const pace = 1.0;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vaani_tts_speaker");
      if (saved) setSelectedSpeaker(saved);
    }
  }, []);

  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const selectLang = (id: string) => {
    setSelectedLangs([id]);
  };

  const { csrfToken } = useCSRF();

  const handleRun = async () => {
    if (!text.trim() || selectedLangs.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setTimings(null);
    setPlayingIdx(null);

    try {
      const res = await fetch("/api/test-pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || "",
        },
        body: JSON.stringify({
          text: text.trim(),
          targetLanguages: selectedLangs,
          speaker: selectedSpeaker,
          pace,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error === "NO_API_KEY"
            ? "No Sarvam API key configured. Add one in Settings."
            : data.error === "TEXT_TOO_LONG"
            ? "Text is too long (max 500 characters)."
            : data.error === "TTS_FAILED"
            ? "Audio generation failed for selected language/voice combination."
            : data.error === "TRANSLATION_FAILED"
            ? "Text translation failed. Check Sarvam API key and connection."
            : `Error: ${data.error || "Pipeline failed"}`
        );
        return;
      }

      setResults(data.results || []);
      setTimings(data.timings);

      if (data.results?.length > 0) {
        setTimeout(() => {
          playAudio(0);
        }, 200);
      }
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (idx: number) => {
    const audioEl = audioRefs.current[idx];
    if (!audioEl) return;

    audioRefs.current.forEach((el, i) => {
      if (el && i !== idx) {
        el.pause();
        el.currentTime = 0;
      }
    });

    if (playingIdx === idx) {
      audioEl.pause();
      setPlayingIdx(null);
    } else {
      audioEl.currentTime = 0;
      audioEl
        .play()
        .then(() => setPlayingIdx(idx))
        .catch((err) => {
          console.warn("Autoplay prevented by browser:", err);
          setPlayingIdx(null);
        });
    }
  };

  const getLanguageInfo = (id: string) =>
    LANGUAGE_REGISTRY.find((l) => l.id === id || l.bcp47 === id) || { name: id, flag: "🌐", nativeName: "" };

  return (
    <GlassCard className="w-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl liquid-glass border border-white/10 flex items-center justify-center text-white">
            <Flask className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-sans font-bold text-white tracking-tight">Pipeline Test</h2>
              <span className="text-[10px] font-sans font-semibold tracking-wider text-neutral-300 border border-white/15 px-2.5 py-0.5 rounded-full uppercase">
                OFFLINE MODE
              </span>
            </div>
            <p className="text-xs font-sans text-neutral-400 mt-0.5">
              Test your TTS voice without going live.
            </p>
          </div>
        </div>
        <button className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
          {collapsed ? <CaretDown className="w-4 h-4" /> : <CaretUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-6 space-y-5 cursor-default">
          {/* Preset phrase pill buttons */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setText(preset)}
                className={`text-xs font-sans px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                  text === preset
                    ? "bg-white text-black border-white font-medium"
                    : "liquid-glass border-white/10 text-neutral-300 hover:text-white hover:border-white/25"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Text input */}
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder="Type something to test your TTS voice..."
              rows={3}
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 font-sans text-sm text-white resize-none focus:outline-none focus:border-white/30 transition-all placeholder:text-neutral-500"
            />
            <span className="absolute bottom-3 right-4 text-[11px] text-neutral-500 font-mono">
              {text.length}/500
            </span>
          </div>

          {/* Language selector */}
          <div>
            <p className="text-[11px] font-sans font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Translate to
            </p>
            <div className="flex flex-wrap gap-2">
              {availableLangs.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => selectLang(lang.id)}
                  className={`flex items-center gap-1.5 text-xs font-sans px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                    selectedLangs.includes(lang.id)
                      ? "bg-white text-black border-white font-medium shadow-sm"
                      : "liquid-glass border-white/10 text-neutral-400 hover:text-white hover:border-white/25"
                  }`}
                >
                  <span>{lang.flag}</span>
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* Speaker selector */}
          <div>
            <p className="text-[11px] font-sans font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Voice
            </p>
            <div className="flex flex-wrap gap-2">
              {VOICE_SPEAKERS.map((spk) => (
                <button
                  key={spk.id}
                  onClick={() => {
                    setSelectedSpeaker(spk.id);
                    localStorage.setItem("vaani_tts_speaker", spk.id);
                  }}
                  className={`flex items-center gap-1.5 text-xs font-sans px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                    selectedSpeaker === spk.id
                      ? "bg-white text-black border-white font-medium shadow-sm"
                      : "liquid-glass border-white/10 text-neutral-400 hover:text-white hover:border-white/25"
                  }`}
                >
                  <Microphone className="w-3.5 h-3.5" />
                  <span>{spk.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Run button + timing stats */}
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={handleRun}
              disabled={!text.trim() || selectedLangs.length === 0 || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-black bg-white hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
            >
              {loading ? (
                <CircleNotch className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" weight="fill" />
              )}
              {loading ? "Processing..." : "Test Pipeline"}
            </button>

            {timings && (
              <span className="text-xs font-sans text-neutral-400">
                Translate: {formatMs(timings.translate)} · TTS: {formatMs(timings.tts)} · Total:{" "}
                <span className="font-medium text-white">{formatMs(timings.total)}</span>
              </span>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-950/30 border border-red-500/30">
              <WarningCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" weight="bold" />
              <p className="text-xs font-sans text-red-300">{error}</p>
            </div>
          )}

          {/* Results list */}
          {results.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="h-px bg-white/10" />
              <p className="text-[11px] font-sans font-semibold text-neutral-400 uppercase tracking-wider">
                Results
              </p>
              {results.map((result, idx) => {
                const lang = getLanguageInfo(result.languageId);
                const audioSrc = `data:audio/wav;base64,${result.audioBase64}`;
                const isPlaying = playingIdx === idx;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-xl liquid-glass border border-white/10"
                  >
                    <div className="text-2xl mt-0.5">{lang.flag}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-sans font-bold text-white">
                            {lang.name}
                          </span>
                          {lang.nativeName && (
                            <span className="text-xs text-neutral-400">{lang.nativeName}</span>
                          )}
                        </div>
                        {result.speaker && (
                          <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border border-white/15 text-neutral-400 capitalize">
                            Voice: {result.speaker}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-sans text-neutral-300 italic leading-relaxed mb-3">
                        &ldquo;{result.translatedText}&rdquo;
                      </p>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => playAudio(idx)}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                            isPlaying
                              ? "bg-[#2DD4BF] text-black border-[#2DD4BF]"
                              : "bg-white/10 hover:bg-white/20 text-white border-white/10"
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5" weight="fill" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" weight="fill" />
                              <span>Listen Audio</span>
                            </>
                          )}
                        </button>

                        <audio
                          ref={(el) => { audioRefs.current[idx] = el; }}
                          src={audioSrc}
                          onPlay={() => setPlayingIdx(idx)}
                          onPause={() => setPlayingIdx((prev) => (prev === idx ? null : prev))}
                          onEnded={() => setPlayingIdx(null)}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
