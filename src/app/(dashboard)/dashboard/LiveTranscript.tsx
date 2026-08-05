"use client";

import { useState, useEffect, useRef } from "react";
import { GlassCard } from "@/app/components/GlassCard";

export function LiveTranscript() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubStream: (() => void) | undefined;
    let unsubSnapshot: (() => void) | undefined;

    import("@/lib/obs-relay-client").then((mod) => {
      unsubStream = mod.obsRelayManager.subscribeStreaming((streaming) => {
        setIsStreaming(streaming);
      });

      unsubSnapshot = mod.obsRelayManager.subscribeSnapshot((snapshot) => {
        if (snapshot.transcriptLines && snapshot.transcriptLines.length > 0) {
          setLines(snapshot.transcriptLines);
        }
      });
    });

    return () => {
      unsubStream?.();
      unsubSnapshot?.();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <GlassCard className="h-full flex flex-col min-h-[380px]">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
        <div>
           <h2 className="text-base font-sans font-bold text-white tracking-tight">Transcription</h2>
           <p className="text-xs text-neutral-400 font-sans mt-0.5">Live output buffer</p>
        </div>
        {isStreaming && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-[#2DD4BF]/40 text-[#2DD4BF] liquid-glass">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2DD4BF] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#2DD4BF]" />
            </span>
            Live
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div 
          ref={scrollRef}
          className="flex-1 min-h-[280px] p-5 overflow-y-auto minimal-scrollbar flex flex-col justify-end border border-dashed border-white/15 bg-black/30 rounded-2xl"
        >
          {lines.length === 0 ? (
            <p className="text-xs text-neutral-500 italic text-center font-sans leading-relaxed my-auto">
              Transcript will appear here when you go live
            </p>
          ) : (
            <div className="space-y-2 mt-auto">
              {lines.map((line, i) => {
                const isLatest = i === lines.length - 1;
                return (
                  <p 
                    key={i} 
                    className={`font-mono text-xs leading-relaxed bg-white/[0.03] p-3 rounded-xl border border-white/5 transition-all duration-300 ${
                      isLatest ? 'text-white border-white/20' : 'text-neutral-400'
                    }`}
                  >
                    {line}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
