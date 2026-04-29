"use client";

import { useState, useEffect, useRef } from "react";
import { FlaskConical, Play, Loader2, Volume2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { LANGUAGE_REGISTRY } from "@/lib/language-registry";

const PRESETS = [
  "Hello, welcome to my stream!",
  "Today we're playing a new game.",
  "Thanks for the raid!",
  "GG, that was a great match.",
  "Donation received — thank you!",
];

type TestResult = {
  languageId: string;
  translatedText: string;
  audioBase64: string;
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
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [availableLangs, setAvailableLangs] = useState<{ id: string; name: string; flag: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [timings, setTimings] = useState<TestTimings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  // Fetch available channels
  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((data) => {
        const channels: { languageId: string; enabled: boolean }[] = Array.isArray(data.channels)
          ? data.channels
          : Array.isArray(data)
          ? data
          : [];

        const enabledLangIds = channels
          .filter((c) => c.enabled !== false)
          .map((c) => c.languageId);

        // Also always show all supported languages even if no channels configured yet
        const allLangIds = enabledLangIds.length > 0
          ? enabledLangIds
          : LANGUAGE_REGISTRY.map((l) => l.id);

        const langs = allLangIds
          .map((id) => {
            const entry = LANGUAGE_REGISTRY.find((l) => l.id === id);
            return entry ? { id: entry.id, name: entry.name, flag: entry.flag } : null;
          })
          .filter(Boolean) as { id: string; name: string; flag: string }[];

        setAvailableLangs(langs);
        // Default: select first language
        if (langs.length > 0) setSelectedLangs([langs[0].id]);
      })
      .catch(() => {
        // Fallback: show all languages
        const langs = LANGUAGE_REGISTRY.map((l) => ({ id: l.id, name: l.name, flag: l.flag }));
        setAvailableLangs(langs);
        if (langs.length > 0) setSelectedLangs([langs[0].id]);
      });
  }, []);

  const toggleLang = (id: string) => {
    setSelectedLangs((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const handleRun = async () => {
    if (!text.trim() || selectedLangs.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setTimings(null);
    setPlayingIdx(null);

    const speaker = localStorage.getItem("vaani_tts_speaker") || "shubh";
    const pace = parseFloat(localStorage.getItem("vaani_tts_pace") || "1.0");

    try {
      const res = await fetch("/api/test-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          targetLanguages: selectedLangs,
          speaker,
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
            : `Error: ${data.error || "Pipeline failed"}`
        );
        return;
      }

      setResults(data.results || []);
      setTimings(data.timings);

      // Auto-play first result
      if (data.results?.length > 0) {
        setTimeout(() => {
          audioRefs.current[0]?.play().catch(() => {});
          setPlayingIdx(0);
        }, 150);
      }
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const getLanguageInfo = (id: string) =>
    LANGUAGE_REGISTRY.find((l) => l.id === id) || { name: id, flag: "🌐", nativeName: "" };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-[28px] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 cursor-pointer"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-amber-50 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-syne font-bold text-gray-900">Pipeline Test</h2>
              <span className="text-[10px] font-bold tracking-widest text-amber-600 bg-amber-50 border border-amber-200/60 rounded-full px-2 py-0.5">
                OFFLINE MODE
              </span>
            </div>
            <p className="text-[12px] font-dm-sans text-gray-400 mt-0.5">
              Test your TTS voice without going live
            </p>
          </div>
        </div>
        <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-6">
          {/* Preset phrases */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setText(preset)}
                className={`text-[12px] font-dm-sans px-3 py-1.5 rounded-full border transition-all ${
                  text === preset
                    ? "bg-[#F5821F]/10 border-[#F5821F]/30 text-[#F5821F] font-medium"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-white hover:border-gray-300"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Text input */}
          <div className="relative mb-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder="Type something to test your TTS voice..."
              rows={3}
              className="w-full bg-gray-50/80 border border-gray-100 rounded-[16px] px-4 py-3 font-dm-sans text-[14px] text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#F5821F]/20 transition-all placeholder:text-gray-400"
            />
            <span className="absolute bottom-3 right-4 text-[11px] text-gray-300 font-mono">
              {text.length}/500
            </span>
          </div>

          {/* Language selector */}
          <div className="mb-5">
            <p className="text-[12px] font-dm-sans font-bold text-gray-500 uppercase tracking-wider mb-2">
              Translate to
            </p>
            <div className="flex flex-wrap gap-2">
              {availableLangs.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => toggleLang(lang.id)}
                  className={`flex items-center gap-1.5 text-[13px] font-dm-sans px-3 py-1.5 rounded-full border transition-all ${
                    selectedLangs.includes(lang.id)
                      ? "bg-gray-900 border-gray-900 text-white font-medium shadow-sm"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-white"
                  }`}
                >
                  <span>{lang.flag}</span>
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* Run button + error */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleRun}
              disabled={!text.trim() || selectedLangs.length === 0 || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-[14px] font-bold text-white bg-gradient-to-r from-[#F5821F] to-[#E8690A] shadow-[0_4px_12px_rgba(245,130,31,0.3)] hover:shadow-[0_6px_20px_rgba(245,130,31,0.4)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_12px_rgba(245,130,31,0.3)] transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              {loading ? "Processing..." : "▶ Test Pipeline"}
            </button>

            {timings && (
              <span className="text-[12px] font-dm-sans text-gray-400">
                Translate: {formatMs(timings.translate)} · TTS: {formatMs(timings.tts)} · Total:{" "}
                <span className="font-medium text-gray-600">{formatMs(timings.total)}</span>
              </span>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-[12px] bg-red-50 border border-red-100 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[13px] font-dm-sans text-red-600">{error}</p>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <div className="h-px bg-gray-100" />
              <p className="text-[12px] font-dm-sans font-bold text-gray-400 uppercase tracking-wider">
                Results
              </p>
              {results.map((result, idx) => {
                const lang = getLanguageInfo(result.languageId);
                const audioSrc = `data:audio/wav;base64,${result.audioBase64}`;
                return (
                  <div
                    key={result.languageId}
                    className="flex items-start gap-4 p-4 rounded-[16px] bg-gray-50/80 border border-gray-100"
                  >
                    <div className="text-2xl mt-0.5">{lang.flag}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-syne font-bold text-gray-800">
                          {lang.name}
                        </span>
                        {lang.nativeName && (
                          <span className="text-[11px] text-gray-400">{lang.nativeName}</span>
                        )}
                      </div>
                      <p className="text-[14px] font-dm-sans text-gray-700 italic leading-relaxed mb-2">
                        &ldquo;{result.translatedText}&rdquo;
                      </p>
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <audio
                          ref={(el) => { audioRefs.current[idx] = el; }}
                          src={audioSrc}
                          controls
                          onPlay={() => setPlayingIdx(idx)}
                          onEnded={() => setPlayingIdx(null)}
                          className="h-8 w-full max-w-[280px] opacity-80"
                        />
                        {playingIdx === idx && (
                          <span className="text-[11px] text-[#F5821F] font-medium animate-pulse">
                            ▶ Playing
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
