"use client";

import { Clock, Calendar, IndianRupee, MessageSquare } from "lucide-react";
import { useState } from "react";

export function PastSessions({ sessions }: { sessions: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!sessions || sessions.length === 0) {
    return (
      <div className="mt-8">
        <p className="text-[12px] font-dm-sans font-bold uppercase tracking-[0.2em] text-[#F5821F] mb-4 drop-shadow-sm">
          Past Sessions
        </p>
        <div className="bg-white/50 backdrop-blur-xl border border-white shadow-sm rounded-[24px] p-8 text-center text-gray-500 text-sm">
          No past sessions yet. Start streaming to see history.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p className="text-[12px] font-dm-sans font-bold uppercase tracking-[0.2em] text-[#F5821F] mb-4 drop-shadow-sm">
        Past Sessions
      </p>

      <div className="space-y-4">
        {sessions.map((s) => {
          const durationMins = Math.round(s.durationMs / 60000);
          const isExpanded = expandedId === s._id;

          return (
            <div
              key={s._id}
              className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-[20px] overflow-hidden transition-all duration-300"
            >
              <div 
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : s._id)}
              >
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-[15px]">
                      {new Date(s.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="hidden md:flex items-center gap-6 text-gray-500 text-[14px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#3B82F6]" />
                      {durationMins} min
                    </div>
                    <div className="flex items-center gap-1.5">
                      <IndianRupee className="w-4 h-4 text-[#F5821F]" />
                      {s.estimatedCostINR.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {s.activeLanguages.map((lang: string) => (
                      <div key={lang} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600 uppercase">
                        {lang.slice(0, 2)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transcript Dropdown */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/50 p-5 max-h-[300px] overflow-y-auto font-dm-sans text-[14px] leading-relaxed text-gray-600">
                  <div className="flex items-center gap-2 mb-3 text-gray-400">
                     <MessageSquare className="w-4 h-4" />
                     <span className="text-[12px] font-bold uppercase tracking-wider">Final Transcript</span>
                  </div>
                  {s.transcript && s.transcript.length > 0 ? (
                    <div className="space-y-1">
                      {s.transcript.map((line: string, i: number) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="italic text-gray-400">No speech detected during this session.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
