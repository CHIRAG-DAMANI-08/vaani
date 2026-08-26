"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, EyeSlash, Check, CircleNotch, ArrowSquareOut, WarningCircle } from "@phosphor-icons/react";
import { useCSRF } from "@/lib/use-csrf";
import OBSWebSocket from "obs-websocket-js";

type StepState = "idle" | "loading" | "success" | "error";
type ErrorCode = "KEY_FORMAT_INVALID" | "KEY_INVALID" | "SARVAM_UNREACHABLE" | "RATE_LIMIT_EXCEEDED" | "CSRF_INVALID" | "INTERNAL_ERROR" | null;
type ObsError = "OBS_UNREACHABLE" | "OBS_AUTH_FAILED" | "OBS_CREDENTIALS_INVALID" | "RATE_LIMIT_EXCEEDED" | "INTERNAL_ERROR" | null;

const ERROR_MESSAGES: Record<string, string> = {
  KEY_FORMAT_INVALID: "Your key should only contain letters, numbers, hyphens, and underscores.",
  KEY_INVALID: "This key wasn't accepted by Sarvam. Check it's copied correctly from your Sarvam dashboard.",
  SARVAM_UNREACHABLE: "Couldn't reach Sarvam right now. Your key hasn't been saved. Try again in a moment.",
  RATE_LIMIT_EXCEEDED: "Too many attempts. Try again in",
  CSRF_INVALID: "Something went wrong. Please refresh and try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

const OBS_ERROR_MESSAGES: Record<string, string> = {
  OBS_UNREACHABLE: "Couldn't reach OBS. Check OBS is open and WebSocket Server is enabled.",
  OBS_AUTH_FAILED: "OBS rejected the password. Check it matches your WebSocket Server settings in OBS.",
  OBS_CREDENTIALS_INVALID: "Invalid credentials format.",
  RATE_LIMIT_EXCEEDED: "Too many attempts. Try again in",
  INTERNAL_ERROR: "Something went wrong saving the credentials.",
};

export function OnboardingModal({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1: Sarvam
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [step1State, setStep1State] = useState<StepState>("idle");
  const [errorCode1, setErrorCode1] = useState<ErrorCode>(null);

  // Step 2: OBS
  const [obsHost, setObsHost] = useState("localhost");
  const [obsPort, setObsPort] = useState("4455");
  const [obsPassword, setObsPassword] = useState("");
  const [showObsPassword, setShowObsPassword] = useState(false);
  const [step2State, setStep2State] = useState<StepState>("idle");
  const [errorCode2, setErrorCode2] = useState<ObsError>(null);
  
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { csrfToken } = useCSRF();

  // Rules:
  const canSubmitStep1 = keyValue.trim().length >= 20 && step1State !== "loading" && step1State !== "success" && countdown === 0;
  
  const isPortValid = parseInt(obsPort) >= 1024 && parseInt(obsPort) <= 65535;
  const canSubmitStep2 = obsHost.trim() !== "" && isPortValid && step2State !== "loading" && step2State !== "success" && countdown === 0;

  // Countdown timer for rate limiting
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (step === 1) { setErrorCode1(null); setStep1State("idle"); }
            if (step === 2) { setErrorCode2(null); setStep2State("idle"); }
            inputRef.current?.focus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [countdown, step]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleValidateStep1 = useCallback(async () => {
    if (!canSubmitStep1) return;
    setStep1State("loading");
    setErrorCode1(null);

    try {
      const res = await fetch("/api/key/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken || "" },
        body: JSON.stringify({ key: keyValue.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStep1State("success");
        setTimeout(() => {
          if (!completedSteps.includes(1)) setCompletedSteps((prev) => [...prev, 1]);
          setStep(2);
        }, 800);
        return;
      }

      if (res.status === 429) {
        setErrorCode1("RATE_LIMIT_EXCEEDED");
        setCountdown(data.retryAfterSeconds || 60);
      } else {
        setErrorCode1(data.error as ErrorCode || "INTERNAL_ERROR");
      }
      setStep1State("error");
    } catch {
      setErrorCode1("INTERNAL_ERROR");
      setStep1State("error");
    }
  }, [canSubmitStep1, csrfToken, keyValue, completedSteps]);

  const handleValidateStep2 = async () => {
    if (!canSubmitStep2) return;
    setStep2State("loading");
    setErrorCode2(null);

    // 1. Client-Side Test
    const obsClient = new OBSWebSocket();
    try {
      await Promise.race([
        obsClient.connect(`ws://${obsHost.trim()}:${obsPort}`, obsPassword),
        new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 8000))
      ]);
      await obsClient.disconnect();
    } catch (err: any) {
      if (err?.code === 4009) {
        setErrorCode2("OBS_AUTH_FAILED");
      } else {
        setErrorCode2("OBS_UNREACHABLE");
      }
      setStep2State("error");
      return;
    }

    // 2. Server-side Persistence
    try {
      const res = await fetch("/api/obs/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken || "" },
        body: JSON.stringify({
          host: obsHost.trim(),
          port: parseInt(obsPort, 10),
          password: obsPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStep2State("success");
        setTimeout(() => {
          if (!completedSteps.includes(2)) setCompletedSteps((prev) => [...prev, 2]);
          setStep(3);
        }, 800);
        return;
      }

      if (res.status === 429) {
        setErrorCode2("RATE_LIMIT_EXCEEDED");
        setCountdown(data.retryAfterSeconds || 60);
      } else {
        setErrorCode2("OBS_CREDENTIALS_INVALID");
      }
      setStep2State("error");
    } catch {
      setErrorCode2("INTERNAL_ERROR");
      setStep2State("error");
    }
  };

  const currentErrorCode = step === 1 ? errorCode1 : errorCode2;
  const currentErrorMsg = step === 1 ? ERROR_MESSAGES[currentErrorCode as string] : OBS_ERROR_MESSAGES[currentErrorCode as string];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[12px] animate-[fade-in_200ms_ease]" />

      <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[520px] min-h-[420px] bg-white/95 backdrop-blur-xl border border-white shadow-[0_32px_80px_rgba(0,0,0,0.12)] rounded-[32px] p-[40px_36px] flex flex-col">
        {/* Step Indicator */}
        <div className="flex justify-center gap-[6px] mb-8">
          {[1, 2, 3].map((i) => {
            const isActive = i === step;
            const isCompleted = completedSteps.includes(i) || i < step;
            return (
              <div
                key={i}
                className={`h-[6px] rounded-full transition-all duration-300 ${
                  isActive
                    ? "w-[24px] bg-[#F5821F] shadow-[0_0_8px_rgba(245,130,31,0.4)]"
                    : isCompleted
                    ? "w-[6px] bg-[#10B981]"
                    : "w-[6px] bg-gray-200"
                }`}
              />
            );
          })}
        </div>

        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* ── STEP 1: Sarvam API Key ── */}
          {step === 1 && (
            <div className="animate-[fade-slide-up_220ms_ease-out_forwards] flex-1 flex flex-col opacity-0">
              <p className="text-[11px] font-dm-sans text-gray-400 mb-2">Step 1 of 3</p>
              <h2 className="text-[24px] font-syne font-bold text-gray-900 tracking-tight mb-2">
                Connect your Sarvam account
              </h2>
              <p className="text-[15px] font-dm-sans text-gray-500 leading-[1.6] mb-7">
                Your API key lets Vaani call Sarvam&apos;s AI on your behalf when you go live.
              </p>

              <div className="relative mb-2">
                <input
                  ref={inputRef}
                  type={showKey ? "text" : "password"}
                  value={keyValue}
                  onChange={(e) => {
                    setKeyValue(e.target.value);
                    if (errorCode1) { setErrorCode1(null); setStep1State("idle"); }
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleValidateStep1(); }}
                  placeholder="sk_live_..."
                  disabled={step1State === "loading" || step1State === "success" || countdown > 0}
                  className={`w-full rounded-[16px] border px-4 py-3.5 pr-12 text-[13px] font-mono text-gray-900 bg-gray-50/50 outline-none transition-all duration-200 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#F5821F]/15 ${
                    step1State === "error"
                      ? "border-[#EF4444] focus:border-[#EF4444]"
                      : step1State === "success"
                      ? "border-[#10B981] focus:border-[#10B981]"
                      : "border-gray-200 focus:border-[#F5821F]/40"
                  }`}
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {step1State === "success" ? <Check className="w-4 h-4 text-[#10B981]" /> : showKey ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end mb-4">
                <a href="https://www.sarvam.ai" target="_blank" rel="noopener noreferrer" className="text-[12px] font-dm-sans font-medium text-[#F5821F] hover:text-[#E8690A] inline-flex items-center gap-1 transition-colors">
                  Get your Sarvam API key <ArrowSquareOut className="w-3 h-3" />
                </a>
              </div>

              <div className="h-[40px] flex items-start">
                {errorCode1 && (
                  <div className="flex items-start gap-2 animate-[fade-in_150ms_ease]">
                    <WarningCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" weight="bold" />
                    <p className="text-[12px] font-dm-sans text-[#EF4444] leading-[1.5]">
                      {currentErrorMsg || "Something went wrong."}
                      {errorCode1 === "RATE_LIMIT_EXCEEDED" && countdown > 0 && <span className="font-mono font-bold ml-1">{formatCountdown(countdown)}</span>}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto flex justify-end">
                <button
                  onClick={handleValidateStep1}
                  disabled={!canSubmitStep1}
                  className={`px-6 py-3 rounded-[16px] text-[14px] font-semibold transition-all duration-300 flex items-center gap-2 ${
                    step1State === "success" ? "bg-[#10B981] text-white" : step1State === "loading" ? "bg-gray-900 text-white opacity-80" : canSubmitStep1 ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {step1State === "loading" && <CircleNotch className="w-4 h-4 animate-spin" />}
                  {step1State === "success" && <Check className="w-4 h-4" />}
                  {step1State === "loading" ? "" : step1State === "success" ? "Continuing..." : "Validate and continue"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Connect OBS Studio ── */}
          {step === 2 && (
            <div className="animate-[fade-slide-up_220ms_ease-out_forwards] flex-1 flex flex-col opacity-0">
              <p className="text-[11px] font-dm-sans text-gray-400 mb-2">Step 2 of 3</p>
              <h2 className="text-[24px] font-syne font-bold text-gray-900 tracking-tight mb-2">
                Connect OBS Studio
              </h2>
              <p className="text-[15px] font-dm-sans text-gray-500 leading-[1.6] mb-7">
                Vaani connects directly to OBS on your machine using OBS WebSocket.
                Enable it in OBS under Tools → WebSocket Server Settings, then enter the details below.
              </p>

              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="text-[12px] font-dm-sans font-semibold text-gray-600 mb-1.5 block">Host</label>
                  <input
                    type="text"
                    value={obsHost}
                    onChange={(e) => { setObsHost(e.target.value); if(errorCode2) { setErrorCode2(null); setStep2State("idle"); } }}
                    placeholder="localhost"
                    disabled={step2State === "loading" || step2State === "success"}
                    className="w-full rounded-[12px] border border-gray-200 px-3.5 py-3 text-[13px] bg-gray-50/50 outline-none focus:border-[#F5821F]/40 focus:ring-2 focus:ring-[#F5821F]/15 transition-all disabled:opacity-50"
                  />
                </div>
                <div className="w-[100px]">
                  <label className="text-[12px] font-dm-sans font-semibold text-gray-600 mb-1.5 block">Port</label>
                  <input
                    type="number"
                    value={obsPort}
                    onChange={(e) => { setObsPort(e.target.value); if(errorCode2) { setErrorCode2(null); setStep2State("idle"); } }}
                    placeholder="4455"
                    disabled={step2State === "loading" || step2State === "success"}
                    className="w-full rounded-[12px] border border-gray-200 px-3.5 py-3 text-[13px] bg-gray-50/50 outline-none focus:border-[#F5821F]/40 focus:ring-2 focus:ring-[#F5821F]/15 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="mb-2">
                <label className="text-[12px] font-dm-sans font-semibold text-gray-600 mb-1.5 flex justify-between">
                  <span>Password</span>
                  <span className="text-gray-400 font-normal">Leave blank if none</span>
                </label>
                <div className="relative">
                  <input
                    type={showObsPassword ? "text" : "password"}
                    value={obsPassword}
                    onChange={(e) => { setObsPassword(e.target.value); if(errorCode2) { setErrorCode2(null); setStep2State("idle"); } }}
                    placeholder=""
                    disabled={step2State === "loading" || step2State === "success"}
                    className="w-full rounded-[12px] border border-gray-200 px-3.5 py-3 pr-10 text-[13px] font-mono bg-gray-50/50 outline-none focus:border-[#F5821F]/40 focus:ring-2 focus:ring-[#F5821F]/15 transition-all disabled:opacity-50"
                    style={{ fontFamily: "var(--font-jetbrains)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowObsPassword(!showObsPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    tabIndex={-1}
                  >
                    {showObsPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end mb-4">
                <a href="https://github.com/obsproject/obs-websocket" target="_blank" rel="noopener noreferrer" className="text-[12px] font-dm-sans font-medium text-[#F5821F] hover:text-[#E8690A] inline-flex items-center gap-1 transition-colors">
                  How to enable OBS WebSocket <ArrowSquareOut className="w-3 h-3" />
                </a>
              </div>

              <div className="h-[40px] flex items-start">
                {errorCode2 && (
                  <div className="flex items-start gap-2 animate-[fade-in_150ms_ease]">
                    <WarningCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" weight="bold" />
                    <p className="text-[12px] font-dm-sans text-[#EF4444] leading-[1.5]">
                      {currentErrorMsg || "Something went wrong."}
                      {errorCode2 === "RATE_LIMIT_EXCEEDED" && countdown > 0 && <span className="font-mono font-bold ml-1">{formatCountdown(countdown)}</span>}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto flex justify-between items-center">
                <button
                  onClick={() => setStep(1)}
                  disabled={step2State === "loading"}
                  className="px-5 py-2.5 rounded-[14px] text-[14px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleValidateStep2}
                  disabled={!canSubmitStep2}
                  className={`px-6 py-3 rounded-[16px] text-[14px] font-semibold transition-all duration-300 flex items-center gap-2 ${
                    step2State === "success" ? "bg-[#10B981] text-white" : step2State === "loading" ? "bg-gray-900 text-white opacity-80" : canSubmitStep2 ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {step2State === "loading" && <CircleNotch className="w-4 h-4 animate-spin" />}
                  {step2State === "success" && <Check className="w-4 h-4" />}
                  {step2State === "loading" ? "" : step2State === "success" ? "Continuing..." : "Connect and continue"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Done ── */}
          {step === 3 && (
            <div className="animate-[fade-slide-up_220ms_ease-out_forwards] flex-1 flex flex-col opacity-0">
              <p className="text-[11px] font-dm-sans text-gray-400 mb-2">Step 3 of 3</p>
              <h2 className="text-[24px] font-syne font-bold text-gray-900 tracking-tight mb-2">
                You&apos;re all set
              </h2>
              <p className="text-[15px] font-dm-sans text-gray-500 leading-[1.6] mb-7">
                All prerequisites are met. We have successfully linked your Sarvam key and your OBS server.
              </p>

              <div className="space-y-3 mb-6">
                 <div className="flex items-center gap-3 p-4 rounded-[16px] bg-[#F0FDF4] border border-[#10B981]/20">
                  <Check className="w-5 h-5 text-[#10B981] shrink-0" />
                  <p className="text-[13px] font-dm-sans font-medium text-[#10B981]">
                    Sarvam API key connected
                  </p>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-[16px] bg-[#F0FDF4] border border-[#10B981]/20">
                  <Check className="w-5 h-5 text-[#10B981] shrink-0" />
                  <p className="text-[13px] font-dm-sans font-medium text-[#10B981]">
                    OBS Studio integration verified
                  </p>
                </div>
              </div>

              <div className="mt-auto flex justify-between items-center">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-[14px] text-[14px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-[16px] text-[14px] font-semibold bg-gray-900 text-white hover:bg-gray-800 shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all"
                >
                  Close & Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
