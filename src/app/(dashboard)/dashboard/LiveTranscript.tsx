"use client";

import { useState, useEffect, useRef } from "react";

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
        if (!streaming) {
          // Don't clear lines — keep them for reference after stopping
        }
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

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_12px_40px_rgba(0,0,0,0.03)] rounded-[32px] flex flex-col h-full min-h-[300px]">
      <div className="flex items-center justify-between px-8 pt-8 pb-4">
        <div>
           <h2 className="text-[18px] font-syne font-bold text-gray-900 tracking-tight">Transcription</h2>
           <p className="text-[13px] text-gray-500 font-dm-sans mt-1">Live output buffer</p>
        </div>
        {isStreaming && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[12px] font-bold tracking-wide bg-[#10B981] text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]">
            <span className="relative flex h-[6px] w-[6px]">
              <span className="animate-[live-pulse_1.8s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-white" />
            </span>
            Live
          </span>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="px-8 pb-8 flex-1 max-h-[220px] overflow-y-auto minimal-scrollbar flex flex-col justify-end bg-gray-50/50 rounded-b-[32px] mx-2 mb-2 border border-gray-100/50 shadow-inner"
      >
        {lines.length === 0 ? (
          <p className="text-[14px] text-gray-400 italic text-center font-dm-sans leading-relaxed">
            {isStreaming
              ? "Listening for audio... speak to see transcription"
              : "Transcript will appear here when you go live"
            }
          </p>
        ) : (
          <div className="space-y-[8px] mt-auto">
            {lines.map((line, i) => {
              const isLatest = i === lines.length - 1;
              const fadeLevel = Math.max(0, 1 - (lines.length - 1 - i) * 0.08);
              return (
                <p 
                  key={i} 
                  className={`font-jetbrains text-[13.5px] leading-[1.8] tracking-tight bg-white p-3 rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-gray-50 transition-all duration-300 ${
                    isLatest ? 'animate-[fade-slide-up_300ms_ease-out_forwards] ring-1 ring-[#F5821F]/10' : ''
                  }`}
                  style={{
                    color: isLatest ? '#111827' : `rgba(17, 24, 39, ${0.35 + fadeLevel * 0.5})`,
                  }}
                >
                  {line}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
