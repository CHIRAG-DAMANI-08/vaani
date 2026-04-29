"use client";

import { X, Headphones, MonitorSpeaker, ArrowRight } from "lucide-react";

export function OBSGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[8px] animate-[fade-in_150ms_ease]" 
        onClick={onClose}
      />
      <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] bg-white/95 backdrop-blur-xl border border-white shadow-[0_32px_80px_rgba(0,0,0,0.12)] rounded-[28px] p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-[20px] font-syne font-bold text-gray-900 mb-1">
              OBS Audio Separation
            </h3>
            <p className="text-[13px] font-dm-sans text-gray-500">
              How to isolate your voice from background noise
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded-[16px] p-4 text-[13px] font-dm-sans text-[#1E3A8A] leading-relaxed">
            <strong>Why do this?</strong> To prevent Vaani from translating game sounds or Discord chatter, we need to send Desktop Audio and Mic Audio on separate stereo channels.
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 shrink-0">1</div>
              <div>
                <p className="text-[14px] font-bold text-gray-900 mb-1">Open Advanced Audio Properties</p>
                <p className="text-[13px] text-gray-500">In OBS Studio, click the gear icon (⚙️) anywhere in the Audio Mixer dock and select "Advanced Audio Properties".</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 shrink-0">2</div>
              <div>
                <p className="text-[14px] font-bold text-gray-900 mb-1">Pan the Sliders</p>
                <p className="text-[13px] text-gray-500 mb-3">Find the "Pan" column and adjust the sliders as follows:</p>
                
                <div className="space-y-2 bg-gray-50 p-3 rounded-[12px] border border-gray-100">
                  <div className="flex items-center gap-3">
                    <MonitorSpeaker className="w-4 h-4 text-gray-400" />
                    <span className="text-[13px] font-medium w-24">Desktop</span>
                    <ArrowRight className="w-3 h-3 text-gray-300" />
                    <span className="text-[13px] font-bold text-[#F5821F]">100% Left</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Headphones className="w-4 h-4 text-gray-400" />
                    <span className="text-[13px] font-medium w-24">Mic/Aux</span>
                    <ArrowRight className="w-3 h-3 text-gray-300" />
                    <span className="text-[13px] font-bold text-[#3B82F6]">100% Right</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 shrink-0">3</div>
              <div>
                <p className="text-[14px] font-bold text-gray-900 mb-1">Check "Mono" (Optional but recommended)</p>
                <p className="text-[13px] text-gray-500">Checking the "Mono" box for both sources ensures they are downmixed properly if you record locally.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-[14px] text-[14px] font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
}
