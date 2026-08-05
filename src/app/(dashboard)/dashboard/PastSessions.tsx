"use client";

import { Clock, Calendar, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { GlassCard } from "@/app/components/GlassCard";

export function PastSessions({ sessions }: { sessions: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!sessions || sessions.length === 0) {
    return (
      <div className="mt-8 space-y-3">
        <p className="text-[11px] font-sans font-semibold uppercase tracking-[2.5px] text-neutral-500">
          PAST SESSIONS
        </p>
        <GlassCard className="p-8 text-center text-neutral-400 text-xs font-sans">
          No past sessions yet. Start streaming to see history.
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-3">
      <p className="text-[11px] font-sans font-semibold uppercase tracking-[2.5px] text-neutral-500">
        PAST SESSIONS
      </p>

      <div className="space-y-3">
        {sessions.map((s, idx) => {
          const durationMins = Math.round(s.durationMs / 60000);
          const isExpanded = expandedId === s._id;

          return (
            <GlassCard
              key={s._id}
              delay={idx * 0.05}
              className="p-0 overflow-hidden"
            >
              <div 
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : s._id)}
              >
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-white font-sans text-sm font-medium">
                    <Calendar className="w-4 h-4 text-neutral-400" strokeWidth={1.6} />
                    <span>
                      {new Date(s.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="hidden md:flex items-center gap-6 text-neutral-400 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.6} />
                      {durationMins} min
                    </div>
                    <div className="flex items-center gap-1.5 font-serif italic text-sm text-white">
                      ₹{s.estimatedCostINR.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex -space-x-1.5">
                    {s.activeLanguages.map((lang: string) => (
                      <div key={lang} className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                        {lang.slice(0, 2)}
                      </div>
                    ))}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-neutral-400" strokeWidth={1.6} />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400" strokeWidth={1.6} />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-white/10 bg-black/40 p-5 max-h-[280px] overflow-y-auto font-sans text-xs leading-relaxed text-neutral-300 space-y-2">
                  <div className="flex items-center gap-2 mb-3 text-neutral-400">
                     <MessageSquare className="w-4 h-4" strokeWidth={1.6} />
                     <span className="text-[10px] font-semibold uppercase tracking-wider">Final Transcript</span>
                  </div>
                  {s.transcript && s.transcript.length > 0 ? (
                    <div className="space-y-1 font-mono text-xs text-neutral-300">
                      {s.transcript.map((line: string, i: number) => (
                        <p key={i}>&ldquo;{line}&rdquo;</p>
                      ))}
                    </div>
                  ) : (
                    <p className="italic text-neutral-500">No speech detected during this session.</p>
                  )}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
