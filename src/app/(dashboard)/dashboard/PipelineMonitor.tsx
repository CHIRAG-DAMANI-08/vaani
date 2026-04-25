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
  { id: "stt", label: "Speech to Text", short: "STT", color: "var(--stage-stt)", status: "idle", value: "—", activeAnim: true },
  { id: "translate", label: "Translation", short: "TRN", color: "var(--stage-translate)", status: "idle", value: "—", activeAnim: true },
  { id: "tts", label: "Text to Speech", short: "TTS", color: "var(--stage-tts)", status: "idle", value: "—", activeAnim: true },
  { id: "stream", label: "Output Stream", short: "OUT", color: "var(--stage-stream)", status: "idle", value: "—", activeAnim: false },
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
        // Update stages from snapshot
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
      className={`bg-white/80 backdrop-blur-xl border border-white shadow-[0_12px_40px_rgba(0,0,0,0.03)] rounded-[32px] overflow-hidden transition-all duration-500 ease-in-out ${isStreaming ? 'max-h-[400px] opacity-100' : 'max-h-[0px] opacity-0 border-0 p-0 !mb-0'}`}
    >
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-[18px] font-syne font-bold text-gray-900 tracking-tight">Active Pipeline</h2>
            <p className="text-[13px] text-gray-500 font-dm-sans mt-1">Real-time processing chain</p>
          </div>
          <span className="text-[13px] font-dm-sans font-bold text-gray-700 bg-white px-4 py-2 rounded-[12px] shadow-sm border border-gray-100 flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${chunksPerSecond > 0 ? 'bg-[#10B981] animate-pulse' : 'bg-gray-300'}`} />
             {chunksPerSecond > 0 ? `${chunksPerSecond}` : '—'} chunks/sec
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-center w-full justify-between gap-4 md:gap-2">
          {stages.map((stage, i) => {
            const isActive = stage.status === "active";
            const isDone = stage.status === "done";
            const isError = stage.status === "error";

            let bg = "bg-gray-50";
            let border = "border border-gray-100";
            let labelColor = "text-gray-400";
            let iconBg = "bg-white text-gray-400";
            
            if (isActive) {
              bg = "bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]";
              border = "border border-white";
              labelColor = "text-gray-900";
              iconBg = ""; // set inline
            } else if (isDone) {
              bg = "bg-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.03)]";
              border = "border border-white";
              labelColor = "text-gray-700";
              iconBg = ""; // set inline with muted color
            } else if (isError) {
              bg = "bg-[#FEF2F2]";
              border = "border border-[#FEE2E2]";
              labelColor = "text-[#EF4444]";
              iconBg = "bg-[#EF4444] text-white shadow-sm";
            }

            return (
              <React.Fragment key={stage.id}>
                {/* Stage Pill */}
                <div 
                  className={`flex-1 w-full md:w-auto min-h-[90px] rounded-[24px] flex items-center p-4 gap-4 box-border transition-all duration-300 relative overflow-hidden ${bg} ${border}`}
                >
                  {/* Active stage shimmer effect */}
                  {isActive && (
                    <div 
                      className="absolute inset-0 opacity-[0.08] pointer-events-none"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${stage.color}, transparent)`,
                        backgroundSize: "200% 100%",
                        animation: "stage-shimmer 2s ease-in-out infinite",
                      }}
                    />
                  )}
                  {/* Icon Node */}
                  <div 
                     className={`w-[48px] h-[48px] shrink-0 rounded-[16px] shadow-sm flex items-center justify-center font-syne font-bold text-[14px] ${iconBg}`}
                     style={(isActive || isDone) ? { background: stage.color, color: 'white', boxShadow: `0 8px 16px color-mix(in srgb, ${stage.color} 30%, transparent)`, opacity: isDone ? 0.7 : 1 } : {}}
                  >
                     {stage.short}
                  </div>
                  
                  <div className="flex flex-col">
                     <span className={`text-[13px] font-dm-sans font-bold tracking-wide ${labelColor}`} style={(isActive || isDone) ? { color: stage.color } : {}}>
                       {stage.label}
                     </span>
                     <span className={`text-[20px] font-syne font-bold text-gray-900 mt-0.5 ${isActive ? 'animate-pulse' : ''}`}>
                       {stage.value}
                     </span>
                  </div>
                </div>

                {/* Connector */}
                {i < stages.length - 1 && (
                  <div className="hidden md:flex items-center justify-center w-6 lg:w-10 shrink-0">
                    <div className="w-full h-[3px] relative rounded-full" style={{ backgroundColor: (isActive || isDone) ? `color-mix(in srgb, ${stage.color} 40%, transparent)` : 'rgba(0,0,0,0.04)' }}>
                      {isActive && stage.activeAnim && (
                         <div className="absolute top-0 left-0 h-full w-1/3 rounded-full bg-white animate-[slide-right_1s_linear_infinite]" />
                      )}
                    </div>
                  </div>
                )}
                
                {/* Mobile Connector */}
                {i < stages.length - 1 && (
                   <div className="md:hidden flex h-4 w-[2px]" style={{ backgroundColor: (isActive || isDone) ? `color-mix(in srgb, ${stage.color} 40%, transparent)` : 'rgba(0,0,0,0.04)' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
