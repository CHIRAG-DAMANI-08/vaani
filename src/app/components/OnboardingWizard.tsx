"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { X, Key, Broadcast, Lightning, ArrowRight, CheckCircle } from "@phosphor-icons/react";
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
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md" />
      <div className="fixed z-[110] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] liquid-glass bg-black/95 border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-4 relative">
          <button onClick={completeWizard} className="absolute top-6 right-6 p-2 text-neutral-400 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-[24px] font-sans font-bold text-white mb-2">Welcome to Vaani</h2>
          <p className="text-[14px] font-sans text-neutral-400">Let&apos;s get your real-time translation environment set up in 3 easy steps.</p>
          
          {/* Stepper */}
          <div className="flex items-center gap-2 mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-500" 
                  style={{ width: step >= i ? '100%' : '0%' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 bg-white/[0.02] flex-1 relative overflow-hidden min-h-[300px] border-t border-white/10">
          
          {/* Step 1: API Key */}
          <div className={`absolute inset-0 p-8 transition-all duration-500 ${step === 1 ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}>
            <div className="w-12 h-12 rounded-[16px] bg-white/10 border border-white/10 text-white flex items-center justify-center mb-6">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="text-[18px] font-bold text-white mb-2">Connect Sarvam AI</h3>
            <p className="text-[13px] text-neutral-400 mb-6">Vaani uses Sarvam&apos;s powerful models for speech recognition and translation. You need an API key to proceed.</p>
            
            <input
              type="password"
              placeholder="Paste your API key here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3.5 text-[14px] font-mono text-white focus:outline-none focus:border-white/30 transition-all mb-4 placeholder:text-neutral-600"
            />
            
            <button
              onClick={handleSaveKey}
              disabled={!apiKey.trim() || isSaving}
              className="w-full bg-white text-black rounded-full py-3.5 text-[14px] font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isSaving ? "Saving..." : "Save Key & Continue"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Step 2: Channel Setup */}
          <div className={`absolute inset-0 p-8 transition-all duration-500 ${step === 2 ? 'translate-x-0 opacity-100' : step < 2 ? 'translate-x-full opacity-0 pointer-events-none' : '-translate-x-full opacity-0 pointer-events-none'}`}>
            <div className="w-12 h-12 rounded-[16px] bg-white/10 border border-white/10 text-white flex items-center justify-center mb-6">
              <Broadcast className="w-6 h-6" />
            </div>
            <h3 className="text-[18px] font-bold text-white mb-2">Add Your First Destination</h3>
            <p className="text-[13px] text-neutral-400 mb-6">Where do you want to broadcast the translated stream? (You can add more languages later).</p>
            
            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="RTMP URL (e.g. rtmp://a.rtmp.youtube.com/live2)"
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-[13px] font-mono text-white focus:outline-none focus:border-white/30 placeholder:text-neutral-600"
              />
              <input
                type="password"
                placeholder="Stream Key"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-[13px] font-mono text-white focus:outline-none focus:border-white/30 placeholder:text-neutral-600"
              />
            </div>
            
            <button
              onClick={handleSaveChannel}
              disabled={!rtmpUrl.trim() || !streamKey.trim() || isSaving}
              className="w-full bg-white text-black rounded-full py-3.5 text-[14px] font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isSaving ? "Saving..." : "Add Channel & Continue"} <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setStep(3)} className="w-full text-center mt-3 text-[12px] text-neutral-500 hover:text-white transition-colors">
              Skip for now
            </button>
          </div>

          {/* Step 3: OBS Instructions */}
          <div className={`absolute inset-0 p-8 transition-all duration-500 ${step === 3 ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
            <div className="w-12 h-12 rounded-[16px] bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 text-[#2DD4BF] flex items-center justify-center mb-6">
              <CheckCircle className="w-6 h-6" weight="fill" />
            </div>
            <h3 className="text-[18px] font-bold text-white mb-2">You&apos;re All Set!</h3>
            <p className="text-[13px] text-neutral-400 mb-6">Now, just point OBS Studio to Vaani&apos;s ingest server to start streaming.</p>
            
            <div className="space-y-3 mb-6 liquid-glass border border-white/10 rounded-2xl p-4">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Server URL</span>
                <p className="text-[13px] font-mono mt-1 text-white select-all">{ingestUrl}</p>
              </div>
              <div className="pt-2 border-t border-white/10">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Stream Key</span>
                <p className="text-[13px] font-mono mt-1 text-white select-all">{user?.id || 'your-user-id'}</p>
              </div>
            </div>
            
            <button
              onClick={completeWizard}
              className="w-full bg-white text-black rounded-full py-3.5 text-[14px] font-bold hover:bg-neutral-200 transition-colors flex justify-center items-center gap-2"
            >
              Go to Dashboard <Lightning className="w-4 h-4" weight="fill" />
            </button>
          </div>
          
        </div>
      </div>
    </>
  );
}
