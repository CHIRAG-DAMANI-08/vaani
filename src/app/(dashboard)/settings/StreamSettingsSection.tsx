"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Radio, Copy, Check, HelpCircle } from "lucide-react";
import { OBSGuideModal } from "@/app/components/OBSGuideModal";

export function StreamSettingsSection() {
  const { user } = useUser();
  const [translationSource, setTranslationSource] = useState("mic_only");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Sync current source state
    import("@/lib/obs-relay-client").then((mod) => {
      setTranslationSource(mod.obsRelayManager.translationSource);
    });
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
    <section className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-[24px] overflow-hidden mb-6 relative group">
      <div className="p-6 md:p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="w-10 h-10 rounded-[12px] bg-[#3B82F6]/10 flex items-center justify-center mb-4">
              <Radio className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <h2 className="text-[20px] font-syne font-bold text-gray-900 mb-2">
              Stream Settings
            </h2>
            <p className="text-[14px] font-dm-sans text-gray-500 max-w-xl">
              Configure how Vaani ingests your stream and which audio channels to translate.
            </p>
          </div>
        </div>

        <div className="space-y-6 max-w-2xl">
          {/* Server URL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
            <p className="text-[13px] font-dm-sans font-bold text-gray-700">Server URL</p>
            <div className="md:col-span-2 relative group/copy cursor-pointer" onClick={() => copyToClipboard("rtmp://localhost:1935/live", "url")}>
              <div className="flex items-center justify-between w-full bg-gray-50/80 border border-gray-100 rounded-[12px] px-4 py-3 text-[14px] font-mono text-gray-600 transition-all group-hover/copy:bg-white group-hover/copy:shadow-sm">
                <span>rtmp://localhost:1935/live</span>
                {copiedUrl ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400 opacity-0 group-hover/copy:opacity-100 transition-opacity" />}
              </div>
            </div>
          </div>

          {/* Stream Key */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
            <p className="text-[13px] font-dm-sans font-bold text-gray-700">Stream Key</p>
            <div className="md:col-span-2 relative group/copy cursor-pointer" onClick={() => user?.id && copyToClipboard(user.id, "key")}>
              <div className="flex items-center justify-between w-full bg-gray-50/80 border border-gray-100 rounded-[12px] px-4 py-3 text-[14px] font-mono text-gray-600 transition-all group-hover/copy:bg-white group-hover/copy:shadow-sm">
                <span className="blur-sm group-hover/copy:blur-none transition-all duration-300">
                  {user?.id || "••••••••"}
                </span>
                {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400 opacity-0 group-hover/copy:opacity-100 transition-opacity" />}
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full my-6" />

          {/* Audio Translation Source */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-start">
            <div>
              <p className="text-[13px] font-dm-sans font-bold text-gray-700 mb-1 flex items-center justify-between">
                Translate Audio From
                <button 
                  onClick={() => setShowGuide(true)}
                  className="text-[#3B82F6] hover:text-[#2563EB] transition-colors p-1"
                  title="How to separate audio"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </p>
              <p className="text-[11px] text-gray-400 leading-snug">
                In OBS, pan Desktop to Left and Mic to Right to separate them.
              </p>
            </div>
            <div className="md:col-span-2">
              <select
                value={translationSource}
                onChange={handleSourceChange}
                className="w-full text-[14px] font-dm-sans bg-gray-50/80 border border-gray-100 rounded-[12px] px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all hover:bg-white"
              >
                <option value="mic_only">Microphone (Right channel)</option>
                <option value="desktop_only">Desktop (Left channel)</option>
                <option value="mixed">Mixed (Mono)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      {showGuide && <OBSGuideModal onClose={() => setShowGuide(false)} />}
    </section>
  );
}
