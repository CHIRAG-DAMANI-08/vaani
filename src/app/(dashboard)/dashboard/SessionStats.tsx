"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, IndianRupee, Layers, Globe, Zap } from "lucide-react";
import { Tooltip } from "@/app/components/Tooltip";

export function SessionStats() {
  const [duration, setDuration] = useState("—");
  const [cost, setCost] = useState("—");
  const [chunks, setChunks] = useState("—");
  const [languages, setLanguages] = useState("—");
  const [latency, setLatency] = useState("—");
  const [isStreaming, setIsStreaming] = useState(false);

  // Live timer
  const [startedAt, setStartedAt] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let unsubStream: (() => void) | undefined;
    let unsubSnapshot: (() => void) | undefined;

    import("@/lib/obs-relay-client").then((mod) => {
      unsubStream = mod.obsRelayManager.subscribeStreaming((streaming) => {
        setIsStreaming(streaming);
        if (!streaming) {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      });

      unsubSnapshot = mod.obsRelayManager.subscribeSnapshot((snapshot) => {
        if (snapshot.stats) {
          setCost(`₹${snapshot.stats.estimatedCostINR.toFixed(2)}`);
          setChunks(String(snapshot.stats.chunksProcessed));
          setLanguages(String(snapshot.stats.activeLanguages));

          // Latency display
          if (snapshot.stats.avgLatencyMs > 0) {
            setLatency(`${(snapshot.stats.avgLatencyMs / 1000).toFixed(1)}s`);
          } else {
            setLatency("—");
          }

          // Use snapshot duration (updates every 1s from server)
          if (snapshot.active) {
            setDuration(snapshot.stats.durationFormatted);
          }
        }
      });
    });

    return () => {
      unsubStream?.();
      unsubSnapshot?.();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stats = [
    { label: "Duration", value: isStreaming ? duration : "—", icon: Clock, color: "#3B82F6" },
    { label: "API Cost", value: isStreaming ? cost : "—", icon: IndianRupee, color: "#F5821F" },
    { label: "Chunks", value: isStreaming ? chunks : "—", icon: Layers, color: "#10B981" },
    { label: "Languages", value: isStreaming ? languages : "—", icon: Globe, color: "#8B5CF6" },
    { label: "Latency", value: isStreaming ? latency : "—", icon: Zap, color: "#EF4444" },
  ];

  return (
    <div className="flex flex-col h-full justify-between gap-[24px]">
      <div className="grid grid-cols-2 gap-[24px] h-full">
        {stats.map((s) => (
           <div 
             key={s.label} 
             className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_12px_40px_rgba(0,0,0,0.03)] rounded-[28px] p-6 flex flex-col justify-center relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-all duration-300"
           >
             {/* Subdued icon in background */}
             <s.icon 
               className="absolute -right-4 -top-4 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity" 
               style={{ color: s.color }} 
             />
             
             {/* Icon header */}
             <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-4 shadow-sm" style={{ background: `color-mix(in srgb, ${s.color} 10%, white)` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
             </div>

             {s.label === "Chunks" || s.label === "Latency" ? (
               <Tooltip 
                 content={s.label === "Chunks" 
                   ? "Audio is processed in 3-second blocks. This is the total number of blocks sent for translation." 
                   : "The time it takes for audio to be transcribed, translated, converted to speech, and pushed to your destination."}
                 position="bottom"
               >
                 <p className="text-[12px] font-dm-sans font-bold text-gray-500 uppercase tracking-[0.1em] mb-1 cursor-help border-b border-dashed border-gray-300 w-fit">{s.label}</p>
               </Tooltip>
             ) : (
               <p className="text-[12px] font-dm-sans font-bold text-gray-500 uppercase tracking-[0.1em] mb-1">{s.label}</p>
             )}
             
             <p className={`text-[28px] font-syne font-bold text-gray-900 ${isStreaming && s.value !== '—' ? '' : 'text-gray-300'}`}>
               {s.value}
             </p>
           </div>
        ))}
      </div>
    </div>
  );
}
