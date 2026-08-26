"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import {
  X,
  Key,
  Broadcast,
  Lightning,
  ArrowRight,
  CheckCircle,
  Warning,
  Eye,
  EyeSlash,
  CircleNotch,
  Headphones,
  SpeakerHigh,
  ArrowSquareOut,
  Copy,
  Check,
  Sparkle,
} from "@phosphor-icons/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { getIngestBaseUrl } from "@/lib/ingest";
import { useCSRF } from "@/lib/use-csrf";

export function OnboardingWizard() {
  const { user } = useUser();
  const { csrfToken } = useCSRF();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // User preferences from beta signup
  const [obsSetup, setObsSetup] = useState<"using_obs" | "needs_guide">("using_obs");
  const [sarvamPreference, setSarvamPreference] = useState<"need_key" | "bring_own">("need_key");
  const [currentKeyChoice, setCurrentKeyChoice] = useState<"need_key" | "bring_own">("need_key");

  // Key details
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Channel details
  const [rtmpUrl, setRtmpUrl] = useState("rtmp://a.rtmp.youtube.com/live2");
  const [streamKey, setStreamKey] = useState("");
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [ingestUrl, setIngestUrl] = useState("rtmp://localhost:1935/live");

  // Copy states
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    setIngestUrl(getIngestBaseUrl());
  }, []);

  useEffect(() => {
    async function checkState() {
      // Don't show if they've dismissed it before (in localStorage)
      if (localStorage.getItem("vaani_onboarding_done")) return;

      try {
        const keyRes = await fetch("/api/key/status");
        if (!keyRes.ok) return;

        const data = await keyRes.json();
        if (data.onboardingComplete || data.connected) {
          localStorage.setItem("vaani_onboarding_done", "true");
          return;
        }

        // Apply preferences from beta application
        if (data.obsSetup === "needs_guide" || data.obsSetup === "using_obs") {
          setObsSetup(data.obsSetup);
        }
        if (data.sarvamPreference === "need_key" || data.sarvamPreference === "bring_own") {
          setSarvamPreference(data.sarvamPreference);
          setCurrentKeyChoice(data.sarvamPreference);
        }

        setIsOpen(true);
        setStep(1);
      } catch (e) {
        logger.error({ err: e }, "Failed to fetch onboarding status");
      }
    }

    checkState();
  }, []);

  const totalSteps = obsSetup === "needs_guide" ? 4 : 3;

  const completeWizard = async () => {
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {
      // Ignore failure
    }
    localStorage.setItem("vaani_onboarding_done", "true");
    setIsOpen(false);
    toast.success("Welcome aboard! Your translation studio is ready.");
  };

  const handleSaveKey = async () => {
    if (currentKeyChoice === "need_key") {
      // User proceeds with shared Vaani beta key
      setStep(2);
      return;
    }

    if (!apiKey.trim()) {
      toast.error("Please enter your Sarvam API key.");
      return;
    }
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
        body: JSON.stringify({ key: apiKey.trim() }),
      });
      if (res.ok) {
        toast.success("Sarvam API key saved successfully!");
        setStep(2);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || data.error || "Failed to validate API key. Please check the key.");
      }
    } catch (e) {
      logger.error({ err: e }, "Onboarding key save failed");
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
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          languageId: "hi",
          enabled: true,
          rtmpUrl: rtmpUrl.trim(),
          rtmpKey: streamKey.trim(),
        }),
      });
      if (res.ok) {
        toast.success("Destination channel created!");
        setStep(3);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save channel. Please try again.");
      }
    } catch (e) {
      logger.error({ err: e }, "Onboarding channel save failed");
      toast.error("Failed to save channel. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyText = (text: string, type: "url" | "key") => {
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md animate-[fade-in_200ms_ease]" />
      <div className="fixed z-[110] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[540px] liquid-glass bg-[#0A0A0C]/95 border border-white/15 shadow-[0_32px_90px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 relative border-b border-white/10">
          <button
            onClick={completeWizard}
            className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Close onboarding"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse shadow-[0_0_8px_#2DD4BF]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#2DD4BF] font-semibold">
              Creator Onboarding
            </span>
          </div>
          
          <h2 className="text-[22px] sm:text-[24px] font-sans font-bold text-white tracking-tight">
            Welcome to Vaani
          </h2>
          <p className="text-[13px] font-sans text-neutral-400 mt-1">
            Let&apos;s configure your multilingual streaming pipeline in {totalSteps} quick steps.
          </p>
          
          {/* Stepper Progress Bar */}
          <div className="flex items-center gap-2 mt-5">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2DD4BF] to-teal-400 transition-all duration-500"
                  style={{ width: step >= i ? "100%" : "0%" }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center text-[11px] font-mono text-neutral-400 mt-2">
            <span>Step {step} of {totalSteps}</span>
            <span>
              {step === 1 && "Sarvam AI"}
              {step === 2 && "Channel Setup"}
              {step === 3 && (obsSetup === "needs_guide" ? "OBS Audio Guide" : "Ready to Stream")}
              {step === 4 && "Ready to Stream"}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
          
          {/* ========================================================================= */}
          {/* STEP 1: SARVAM AI KEY                                                    */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-6 animate-[fade-in_200ms_ease]">
              {currentKeyChoice === "need_key" ? (
                /* Mode A: Vaani Beta Shared Key with Free Tier Rate Limits Warning */
                <>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Sparkle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-mono font-medium mb-1">
                        Beta Access Key
                      </div>
                      <h3 className="text-[18px] font-bold text-white">
                        Vaani-Provided Sarvam AI
                      </h3>
                      <p className="text-[13px] text-neutral-400 mt-0.5">
                        You are set up with Vaani&apos;s managed speech recognition and translation pool.
                      </p>
                    </div>
                  </div>

                  {/* Free Tier Rate Limits Warning Box */}
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4.5 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold text-[13px]">
                      <Warning className="w-4 h-4 shrink-0" weight="fill" />
                      <span>Free Tier Rate Limits & Quotas</span>
                    </div>
                    <p className="text-[12px] text-neutral-300 leading-relaxed font-sans">
                      During the creator beta, free tier accounts are subject to shared concurrency limits (up to 30 mins translation per day with queue throttling during peak hours).
                    </p>
                    <p className="text-[12px] text-amber-300/80 leading-relaxed font-sans pt-1 border-t border-amber-500/15">
                      To unlock higher concurrency and unlimited streaming hours, you will need to move to a paid plan once billing goes live. <span className="text-neutral-400">(Paid plans coming soon)</span>
                    </p>
                  </div>

                  <button
                    onClick={handleSaveKey}
                    disabled={isSaving}
                    className="w-full bg-white text-black rounded-full py-3.5 text-[14px] font-bold hover:bg-neutral-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2 cursor-pointer shadow-lg"
                  >
                    Continue with Vaani Key <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Separator with OR */}
                  <div className="relative my-4 flex items-center justify-center">
                    <div className="w-full border-t border-white/10" />
                    <span className="absolute bg-[#0A0A0C] px-3 text-[11px] font-mono uppercase tracking-widest text-neutral-400">
                      or
                    </span>
                  </div>

                  {/* Option to Bring Own Key */}
                  <div className="text-center">
                    <p className="text-[12px] text-neutral-400 mb-2.5">
                      Have your own Sarvam API key?
                    </p>
                    <button
                      type="button"
                      onClick={() => setCurrentKeyChoice("bring_own")}
                      className="w-full py-3 px-4 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white text-[13px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Key className="w-4 h-4 text-[#2DD4BF]" />
                      Enter your personal Sarvam API key instead
                    </button>
                  </div>
                </>
              ) : (
                /* Mode B: Bring Own Key with Input */
                <>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 text-[#2DD4BF] flex items-center justify-center shrink-0">
                      <Key className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 text-[#2DD4BF] text-[11px] font-mono font-medium mb-1">
                        Custom API Key
                      </div>
                      <h3 className="text-[18px] font-bold text-white">
                        Enter Sarvam AI Key
                      </h3>
                      <p className="text-[13px] text-neutral-400 mt-0.5">
                        Bring your own API key to stream without shared pool concurrency limits.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[12px] font-medium text-neutral-300 flex items-center justify-between">
                      <span>Sarvam API Key</span>
                      <a
                        href="https://dashboard.sarvam.ai"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#2DD4BF] hover:underline inline-flex items-center gap-1"
                      >
                        Get key from Sarvam <ArrowSquareOut className="w-3 h-3" />
                      </a>
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        placeholder="sk_live_..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3.5 pr-11 text-[13px] font-mono text-white focus:outline-none focus:border-[#2DD4BF]/60 transition-all placeholder:text-neutral-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showApiKey ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveKey}
                    disabled={!apiKey.trim() || isSaving}
                    className="w-full bg-white text-black rounded-full py-3.5 text-[14px] font-bold hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-40 flex justify-center items-center gap-2 cursor-pointer shadow-lg"
                  >
                    {isSaving ? (
                      <>
                        <CircleNotch className="w-4 h-4 animate-spin" /> Validating Key...
                      </>
                    ) : (
                      <>
                        Validate & Save Key <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Separator with OR */}
                  <div className="relative my-4 flex items-center justify-center">
                    <div className="w-full border-t border-white/10" />
                    <span className="absolute bg-[#0A0A0C] px-3 text-[11px] font-mono uppercase tracking-widest text-neutral-400">
                      or
                    </span>
                  </div>

                  {/* Option to Switch to Vaani Key */}
                  <div className="text-center">
                    <p className="text-[12px] text-neutral-400 mb-2.5">
                      Don&apos;t have an API key right now?
                    </p>
                    <button
                      type="button"
                      onClick={() => setCurrentKeyChoice("need_key")}
                      className="w-full py-3 px-4 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white text-[13px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkle className="w-4 h-4 text-amber-400" />
                      Use Vaani&apos;s Beta Key (Free Tier)
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: CHANNEL DESTINATION                                              */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-6 animate-[fade-in_200ms_ease]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-[#2DD4BF] flex items-center justify-center shrink-0">
                  <Broadcast className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-white">
                    Add Your Stream Destination
                  </h3>
                  <p className="text-[13px] text-neutral-400 mt-0.5">
                    Where should Vaani deliver the translated broadcast? (e.g. YouTube Live Hindi channel).
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-medium text-neutral-300 mb-1.5 block">
                    YouTube RTMP Server URL
                  </label>
                  <input
                    type="text"
                    placeholder="rtmp://a.rtmp.youtube.com/live2"
                    value={rtmpUrl}
                    onChange={(e) => setRtmpUrl(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-[13px] font-mono text-white focus:outline-none focus:border-[#2DD4BF]/60 transition-all placeholder:text-neutral-600"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-neutral-300 mb-1.5 block">
                    YouTube Stream Key
                  </label>
                  <div className="relative">
                    <input
                      type={showStreamKey ? "text" : "password"}
                      placeholder="xxxx-xxxx-xxxx-xxxx"
                      value={streamKey}
                      onChange={(e) => setStreamKey(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 pr-11 text-[13px] font-mono text-white focus:outline-none focus:border-[#2DD4BF]/60 transition-all placeholder:text-neutral-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStreamKey(!showStreamKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showStreamKey ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleSaveChannel}
                  disabled={!rtmpUrl.trim() || !streamKey.trim() || isSaving}
                  className="w-full bg-white text-black rounded-full py-3.5 text-[14px] font-bold hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-40 flex justify-center items-center gap-2 cursor-pointer shadow-lg"
                >
                  {isSaving ? (
                    <>
                      <CircleNotch className="w-4 h-4 animate-spin" /> Saving Destination...
                    </>
                  ) : (
                    <>
                      Save Channel & Continue <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full text-center py-2 text-[12px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Skip destination setup for now
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3 (IF NEEDS_GUIDE): OBS AUDIO SEPARATION GUIDE                       */}
          {/* ========================================================================= */}
          {step === 3 && obsSetup === "needs_guide" && (
            <div className="space-y-6 animate-[fade-in_200ms_ease]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-mono font-medium mb-1">
                    Setup Guide
                  </div>
                  <h3 className="text-[18px] font-bold text-white">
                    OBS Studio Audio Separation
                  </h3>
                  <p className="text-[13px] text-neutral-400 mt-0.5">
                    Isolate your mic voice so game audio & Discord aren&apos;t translated into speech.
                  </p>
                </div>
              </div>

              {/* 3 Step Visual Guide */}
              <div className="space-y-3.5">
                {/* Step 1 */}
                <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] flex gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-mono font-bold text-[12px] text-white shrink-0">
                    1
                  </div>
                  <div className="text-[12px] leading-relaxed">
                    <p className="font-semibold text-white">Open Advanced Audio Properties</p>
                    <p className="text-neutral-400 mt-0.5">
                      In OBS Studio, click the gear icon (⚙️) on any audio source in the <span className="text-white font-medium">Audio Mixer</span> dock and choose <span className="text-white font-medium">Advanced Audio Properties</span>.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] flex gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-mono font-bold text-[12px] text-white shrink-0">
                    2
                  </div>
                  <div className="text-[12px] leading-relaxed flex-1">
                    <p className="font-semibold text-white">Pan Stereo Sliders</p>
                    <p className="text-neutral-400 mt-0.5 mb-2.5">
                      Adjust the <span className="text-white font-medium">Pan</span> sliders to separate game sound from your voice:
                    </p>

                    <div className="space-y-2 bg-black/40 p-2.5 rounded-xl border border-white/10 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-neutral-300">
                          <SpeakerHigh className="w-4 h-4 text-neutral-400" /> Desktop Audio
                        </span>
                        <span className="font-bold text-amber-400">100% Left</span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                        <span className="flex items-center gap-2 text-neutral-300">
                          <Headphones className="w-4 h-4 text-[#2DD4BF]" /> Mic / Voice
                        </span>
                        <span className="font-bold text-[#2DD4BF]">100% Right</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] flex gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-mono font-bold text-[12px] text-white shrink-0">
                    3
                  </div>
                  <div className="text-[12px] leading-relaxed">
                    <p className="font-semibold text-white">Check &ldquo;Mono&rdquo; Downmix (Recommended)</p>
                    <p className="text-neutral-400 mt-0.5">
                      Enable Mono for both sources so any local recording retains clear centered stereo balance.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(4)}
                className="w-full bg-white text-black rounded-full py-3.5 text-[14px] font-bold hover:bg-neutral-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2 cursor-pointer shadow-lg"
              >
                I&apos;ve configured OBS, Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FINAL STEP: READY TO STREAM                                              */}
          {/* ========================================================================= */}
          {((step === 3 && obsSetup === "using_obs") || step === 4) && (
            <div className="space-y-6 animate-[fade-in_200ms_ease]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6" weight="fill" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-medium mb-1">
                    Setup Complete
                  </div>
                  <h3 className="text-[18px] font-bold text-white">
                    You&apos;re All Set to Stream!
                  </h3>
                  <p className="text-[13px] text-neutral-400 mt-0.5">
                    Point OBS Studio to your Vaani ingest server to begin real-time multilingual broadcasting.
                  </p>
                </div>
              </div>

              {/* Ingest Server Details Card */}
              <div className="space-y-3 liquid-glass border border-white/10 rounded-2xl p-4 sm:p-5 bg-black/40">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      OBS Server (Custom RTMP)
                    </span>
                    <button
                      onClick={() => copyText(ingestUrl, "url")}
                      className="text-[11px] text-[#2DD4BF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedUrl ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="bg-white/[0.04] px-3.5 py-2.5 rounded-xl border border-white/10 font-mono text-[12px] text-white select-all">
                    {ingestUrl}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      OBS Stream Key
                    </span>
                    <button
                      onClick={() => copyText(user?.id || "your-user-id", "key")}
                      className="text-[11px] text-[#2DD4BF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedKey ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="bg-white/[0.04] px-3.5 py-2.5 rounded-xl border border-white/10 font-mono text-[12px] text-white select-all">
                    {user?.id || "your-user-id"}
                  </div>
                </div>
              </div>

              <button
                onClick={completeWizard}
                className="w-full bg-white text-black rounded-full py-3.5 text-[14px] font-bold hover:bg-neutral-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2 cursor-pointer shadow-lg"
              >
                Go to Dashboard <Lightning className="w-4 h-4" weight="fill" />
              </button>
            </div>
          )}
          
        </div>
      </div>
    </>
  );
}
