"use client";

import { X, Headphones, SpeakerHigh, ArrowRight } from "@phosphor-icons/react";

export function OBSGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md animate-[fade-in_150ms_ease]" 
        onClick={onClose}
      />
      <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] liquid-glass bg-black/95 border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.5)] rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-[20px] font-sans font-bold text-white mb-1">
              OBS Audio Separation
            </h3>
            <p className="text-[13px] font-sans text-neutral-400">
              How to isolate your voice from background noise
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-[13px] font-sans text-neutral-300 leading-relaxed">
            <strong className="text-white">Why do this?</strong> To prevent Vaani from translating game sounds or Discord chatter, we need to send Desktop Audio and Mic Audio on separate stereo channels.
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center font-bold text-xs text-white shrink-0">1</div>
              <div>
                <p className="text-[14px] font-bold text-white mb-1">Open Advanced Audio Properties</p>
                <p className="text-[13px] text-neutral-400">In OBS Studio, click the gear icon (⚙️) anywhere in the Audio Mixer dock and select &ldquo;Advanced Audio Properties&rdquo;.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center font-bold text-xs text-white shrink-0">2</div>
              <div>
                <p className="text-[14px] font-bold text-white mb-1">Pan the Sliders</p>
                <p className="text-[13px] text-neutral-400 mb-3">Find the &ldquo;Pan&rdquo; column and adjust the sliders as follows:</p>
                
                <div className="space-y-2 bg-white/[0.02] p-3.5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <SpeakerHigh className="w-4 h-4 text-neutral-400" />
                    <span className="text-[13px] font-medium text-neutral-300 w-24">Desktop</span>
                    <ArrowRight className="w-3 h-3 text-neutral-500" />
                    <span className="text-[13px] font-bold text-white">100% Left</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Headphones className="w-4 h-4 text-neutral-400" />
                    <span className="text-[13px] font-medium text-neutral-300 w-24">Mic/Aux</span>
                    <ArrowRight className="w-3 h-3 text-neutral-500" />
                    <span className="text-[13px] font-bold text-[#2DD4BF]">100% Right</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center font-bold text-xs text-white shrink-0">3</div>
              <div>
                <p className="text-[14px] font-bold text-white mb-1">Check &ldquo;Mono&rdquo; (Optional but recommended)</p>
                <p className="text-[13px] text-neutral-400">Checking the &ldquo;Mono&rdquo; box for both sources ensures they are downmixed properly if you record locally.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-[14px] font-semibold bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
}
