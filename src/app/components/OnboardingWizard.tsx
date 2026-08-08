"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { X, KeyRound, Radio, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { getIngestBaseUrl } from "@/lib/ingest";
import { useCSRF } from "@/lib/use-csrf";

export function OnboardingWizard() {
  const { user } = useUser();
  const { csrfToken } = useCSRF();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Channel details
  const [platform, setPlatform] = useState("youtube");
  const [rtmpUrl, setRtmpUrl] = useState("rtmp://a.rtmp.youtube.com/live2");
  const [streamKey, setStreamKey] = useState("");
  const [ingestUrl, setIngestUrl] = useState("rtmp://localhost:1935/live");

  useEffect(() => {
    setIngestUrl(getIngestBaseUrl());
  }, []);

  useEffect(() => {
    // Check if we need to show the wizard
    async function checkState() {
      // Don't show if they've dismissed it before (in localStorage)
      if (localStorage.getItem("vaani_onboarding_done")) return;

      try {
        // Source of truth is the server: once a key is saved the User doc has
        // onboardingComplete=true, so the wizard must not re-open (across
        // browsers / after sign-out), regardless of localStorage.
        const keyRes = await fetch("/api/key/status");
        if (!keyRes.ok) return;

        const data = await keyRes.json();
        if (data.onboardingComplete || data.connected) {
          localStorage.setItem("vaani_onboarding_done", "true");
          return;
        }

        setIsOpen(true);
        setStep(1);
      } catch (e) {
        // Silently fail
      }
    }

    checkState();
  }, []);

  const completeWizard = () => {
    localStorage.setItem("vaani_onboarding_done", "true");
    setIsOpen(false);
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    if (!csrfToken) {
      toast.error("Still setting up. Please try again in a moment.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/key/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ key: apiKey }),
      });
      if (res.ok) {
        setStep(2);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save API key. Please try again.");
      }
    } catch (e) {
      logger.error({ err: e }, "Onboarding step failed");
      toast.error("Failed to save API key. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChannel = async () => {
    if (!csrfToken) {
      toast.error("Still setting up. Please try again in a moment.");
      return;
    }
    setIsSaving(true);
    try {
      // Create a default Hindi channel
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          languageId: "hi",
          enabled: true,
          rtmpUrl,
          rtmpKey: streamKey,
        }),
      });
      if (res.ok) {
        setStep(3);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save channel. Please try again.");
      }
    } catch (e) {
      logger.error({ err: e }, "Onboarding step failed");
      toast.error("Failed to save channel. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md" />
      <div className="fixed z-[110] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] bg-white/95 backdrop-blur-xl border border-white shadow-[0_32px_80px_rgba(0,0,0,0.12)] rounded-[28px] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-4 relative">
          <button onClick={completeWizard} className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-[24px] font-syne font-bold text-gray-900 mb-2">Welcome to Vaani</h2>
          <p className="text-[14px] font-dm-sans text-gray-500">Let's get your real-time translation environment set up in 3 easy steps.</p>
          
          {/* Stepper */}
          <div className="flex items-center gap-2 mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div 
                  className="h-full bg-[#F5821F] transition-all duration-500" 
                  style={{ width: step >= i ? '100%' : '0%' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 bg-gray-50/50 flex-1 relative overflow-hidden min-h-[300px]">
          
          {/* Step 1: API Key */}
          <div className={`absolute inset-0 p-8 transition-all duration-500 ${step === 1 ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}>
            <div className="w-12 h-12 rounded-[16px] bg-[#FFF2E5] text-[#F5821F] flex items-center justify-center mb-6">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-[18px] font-bold text-gray-900 mb-2">Connect Sarvam AI</h3>
            <p className="text-[13px] text-gray-500 mb-6">Vaani uses Sarvam's powerful models for speech recognition and translation. You need an API key to proceed.</p>
            
            <input
              type="password"
              placeholder="Paste your API key here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-[14px] px-4 py-3.5 text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-[#F5821F]/20 focus:border-[#F5821F] transition-all mb-4"
            />
            
            <button
              onClick={handleSaveKey}
              disabled={!apiKey.trim() || isSaving}
              className="w-full bg-gray-900 text-white rounded-[14px] py-3.5 text-[14px] font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isSaving ? "Saving..." : "Save Key & Continue"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Step 2: Channel Setup */}
          <div className={`absolute inset-0 p-8 transition-all duration-500 ${step === 2 ? 'translate-x-0 opacity-100' : step < 2 ? 'translate-x-full opacity-0 pointer-events-none' : '-translate-x-full opacity-0 pointer-events-none'}`}>
            <div className="w-12 h-12 rounded-[16px] bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mb-6">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-[18px] font-bold text-gray-900 mb-2">Add Your First Destination</h3>
            <p className="text-[13px] text-gray-500 mb-6">Where do you want to broadcast the translated stream? (You can add more languages later).</p>
            
            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="RTMP URL (e.g. rtmp://a.rtmp.youtube.com/live2)"
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-[14px] px-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
              />
              <input
                type="password"
                placeholder="Stream Key"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-[14px] px-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
              />
            </div>
            
            <button
              onClick={handleSaveChannel}
              disabled={!rtmpUrl.trim() || !streamKey.trim() || isSaving}
              className="w-full bg-[#4F46E5] text-white rounded-[14px] py-3.5 text-[14px] font-bold hover:bg-[#4338CA] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isSaving ? "Saving..." : "Add Channel & Continue"} <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setStep(3)} className="w-full text-center mt-3 text-[12px] text-gray-400 hover:text-gray-600">
              Skip for now
            </button>
          </div>

          {/* Step 3: OBS Instructions */}
          <div className={`absolute inset-0 p-8 transition-all duration-500 ${step === 3 ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
            <div className="w-12 h-12 rounded-[16px] bg-[#ECFDF5] text-[#10B981] flex items-center justify-center mb-6">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-[18px] font-bold text-gray-900 mb-2">You're All Set!</h3>
            <p className="text-[13px] text-gray-500 mb-6">Now, just point OBS Studio to Vaani's ingest server to start streaming.</p>
            
            <div className="space-y-3 mb-6 bg-white border border-gray-200 rounded-[16px] p-4">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase">Server URL</span>
                <p className="text-[13px] font-mono mt-1 text-gray-900 select-all">{ingestUrl}</p>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <span className="text-[11px] font-bold text-gray-400 uppercase">Stream Key</span>
                <p className="text-[13px] font-mono mt-1 text-gray-900 select-all">{user?.id || 'your-user-id'}</p>
              </div>
            </div>
            
            <button
              onClick={completeWizard}
              className="w-full bg-[#10B981] text-white rounded-[14px] py-3.5 text-[14px] font-bold hover:bg-[#059669] transition-colors flex justify-center items-center gap-2 shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
            >
              Go to Dashboard <Zap className="w-4 h-4" />
            </button>
          </div>
          
        </div>
      </div>
    </>
  );
}
