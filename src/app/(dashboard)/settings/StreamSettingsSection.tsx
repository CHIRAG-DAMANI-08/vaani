"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Broadcast, Copy, Check, Question, Microphone } from "@phosphor-icons/react";
import { OBSGuideModal } from "@/app/components/OBSGuideModal";
import { GlassCard } from "@/app/components/GlassCard";
import { getIngestBaseUrl } from "@/lib/ingest";

export function StreamSettingsSection() {
  const { user } = useUser();
  const [translationSource, setTranslationSource] = useState("mic_only");
  const [ingestUrl, setIngestUrl] = useState("rtmp://localhost:1935/live");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    import("@/lib/obs-relay-client").then((mod) => {
      setTranslationSource(mod.obsRelayManager.translationSource);
    });
  }, []);

  useEffect(() => {
    setIngestUrl(getIngestBaseUrl());
  }, []);

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const src = e.target.value;
    setTranslationSource(src);
    import("@/lib/obs-relay-client").then((mod) => {
      mod.obsRelayManager.setTranslationSource(src);
    });
  };

  const copyToClipboard = (text: string, type: "url" | "key") => {
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <GlassCard className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0">
            <Broadcast className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-sans font-bold text-white tracking-tight">Stream Settings</h2>
            <p className="text-xs font-sans text-neutral-400 mt-0.5">Configure stream ingestion and audio channel selection.</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Server URL Row */}
        <div className="flex items-center justify-between py-2">
          <span className="text-xs font-sans font-semibold text-neutral-400 uppercase tracking-wider">Server URL</span>
          <div 
            className="liquid-glass border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:border-white/20 transition-all"
            onClick={() => copyToClipboard(ingestUrl, "url")}
          >
            <span className="font-mono text-xs text-neutral-300">{ingestUrl}</span>
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-[#2DD4BF]" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* Stream Key Row */}
        <div className="flex items-center justify-between py-2">
          <span className="text-xs font-sans font-semibold text-neutral-400 uppercase tracking-wider">Stream Key</span>
          <div 
            className="liquid-glass border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:border-white/20 transition-all"
            onClick={() => user?.id && copyToClipboard(user.id, "key")}
          >
            <span className="font-mono text-xs text-neutral-300">
              {user?.id ? `${user.id.slice(0, 10)}••••••••` : "••••••••••••••••"}
            </span>
            {copiedKey ? <Check className="w-3.5 h-3.5 text-[#2DD4BF]" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* Audio Source Dropdown Row */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Microphone className="w-3.5 h-3.5 text-neutral-400" />
              Translate Audio From
            </span>
            <button 
              onClick={() => setShowGuide(true)}
              className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <Question className="w-3.5 h-3.5" />
              <span>Guide</span>
            </button>
          </div>
          <select
            value={translationSource}
            onChange={handleSourceChange}
            className="w-full text-xs font-sans bg-white/[0.02] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-white/30 transition-all cursor-pointer"
          >
            <option value="mic_only" className="bg-neutral-900 text-white">Microphone (Right channel)</option>
            <option value="desktop_only" className="bg-neutral-900 text-white">Desktop (Left channel)</option>
            <option value="mixed" className="bg-neutral-900 text-white">Mixed (Mono)</option>
          </select>
          <p className="text-[11px] font-sans text-neutral-500">
            Source audio is automatically transcribed and translated into active channels.
          </p>
        </div>
      </div>
      {showGuide && <OBSGuideModal onClose={() => setShowGuide(false)} />}
    </GlassCard>
  );
}
