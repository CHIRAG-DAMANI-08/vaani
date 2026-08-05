"use client";

import React, { useState, useEffect } from "react";

type StageData = {
  id: string;
  label: string;
  short: string;
  color: string;
  status: "idle" | "active" | "done" | "error";
  value: string;
  activeAnim: boolean;
};

const defaultStages: StageData[] = [
  { id: "stt", label: "Speech to Text", short: "STT", color: "#2DD4BF", status: "idle", value: "—", activeAnim: true },
  { id: "translate", label: "Translation", short: "TRN", color: "#2DD4BF", status: "idle", value: "—", activeAnim: true },
  { id: "tts", label: "Text to Speech", short: "TTS", color: "#2DD4BF", status: "idle", value: "—", activeAnim: true },
  { id: "stream", label: "Output Stream", short: "OUT", color: "#2DD4BF", status: "idle", value: "—", activeAnim: false },
];

export function PipelineMonitor() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [stages, setStages] = useState<StageData[]>(defaultStages);
  const [chunksPerSecond, setChunksPerSecond] = useState(0);

  useEffect(() => {
    let unsubStream: (() => void) | undefined;
    let unsubSnapshot: (() => void) | undefined;
    let unsubPipeline: (() => void) | undefined;

    import("@/lib/obs-relay-client").then((mod) => {
      unsubStream = mod.obsRelayManager.subscribeStreaming((streaming) => {
        setIsStreaming(streaming);
        if (!streaming) {
          setStages(defaultStages);
          setChunksPerSecond(0);
        }
      });

      unsubSnapshot = mod.obsRelayManager.subscribeSnapshot((snapshot) => {
        if (snapshot.stats) {
          setChunksPerSecond(snapshot.stats.chunksPerSecond);
        }
        if (snapshot.stages) {
          setStages((prev) =>
            prev.map((s) => {
              const snapStage = (snapshot.stages as any)[s.id];
              if (snapStage) {
                return {
                  ...s,
                  status: snapStage.status as any,
                  value: snapStage.value || s.value,
                };
              }
              return s;
            })
          );
        }
      });

      unsubPipeline = mod.obsRelayManager.subscribePipelineUpdates((update) => {
        setStages((prev) =>
          prev.map((s) => {
            if (s.id === update.stage) {
              return {
                ...s,
                status: update.status as any,
                value: update.data?.time
                  ? `${(update.data.time / 1000).toFixed(1)}s`
                  : update.status === "active"
                  ? "..."
                  : s.value,
              };
            }
            return s;
          })
        );
      });
    });

    return () => {
      unsubStream?.();
      unsubSnapshot?.();
      unsubPipeline?.();
    };
  }, []);

  return (
    <div 
      className={`liquid-glass rounded-2xl border border-white/10 overflow-hidden transition-all duration-500 ease-in-out ${isStreaming ? 'max-h-[400px] opacity-100' : 'max-h-[0px] opacity-0 border-0 p-0 !mb-0'}`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-sans font-bold text-white tracking-tight">Active Pipeline</h2>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">Real-time processing chain</p>
          </div>
          <span className="text-xs font-sans font-semibold text-white liquid-glass px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
             <div className={`w-1.5 h-1.5 rounded-full ${chunksPerSecond > 0 ? 'bg-[#2DD4BF] animate-pulse' : 'bg-neutral-600'}`} />
             {chunksPerSecond > 0 ? `${chunksPerSecond}` : '—'} chunks/sec
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-center w-full justify-between gap-4 md:gap-3">
          {stages.map((stage, i) => {
            const isActive = stage.status === "active";
            const isDone = stage.status === "done";
            const isError = stage.status === "error";

            let bg = "bg-white/[0.02]";
            let border = "border border-white/10";
            let labelColor = "text-neutral-400";
            
            if (isActive) {
              bg = "liquid-glass bg-white/[0.06]";
              border = "border border-[#2DD4BF]/40";
              labelColor = "text-[#2DD4BF]";
            } else if (isDone) {
              bg = "liquid-glass";
              border = "border border-white/20";
              labelColor = "text-white";
            } else if (isError) {
              bg = "bg-red-950/30";
              border = "border border-red-500/40";
              labelColor = "text-red-400";
            }

            return (
              <React.Fragment key={stage.id}>
                {/* Stage Pill */}
                <div 
                  className={`flex-1 w-full md:w-auto min-h-[80px] rounded-2xl flex items-center p-4 gap-3.5 transition-all duration-300 relative overflow-hidden ${bg} ${border}`}
                >
                  {/* Icon Node */}
                  <div 
                     className={`w-11 h-11 shrink-0 rounded-xl border border-white/10 flex items-center justify-center font-sans font-bold text-xs ${
                       isActive ? 'bg-white text-black' : 'liquid-glass text-neutral-300'
                     }`}
                  >
                     {stage.short}
                  </div>
                  
                  <div className="flex flex-col">
                     <span className={`text-xs font-sans font-semibold tracking-wide ${labelColor}`}>
                       {stage.label}
                     </span>
                     <span className={`text-lg font-serif italic font-normal text-white mt-0.5 ${isActive ? 'animate-pulse' : ''}`}>
                       {stage.value}
                     </span>
                  </div>
                </div>

                {/* Connector */}
                {i < stages.length - 1 && (
                  <div className="hidden md:flex items-center justify-center w-6 shrink-0">
                    <div className="w-full h-[1px] bg-white/15 relative" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
