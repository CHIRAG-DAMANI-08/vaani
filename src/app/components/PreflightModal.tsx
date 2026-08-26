"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, WarningCircle, CircleNotch, ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { obsRelayManager } from "@/lib/obs-relay-client";

export function PreflightModal({ onClose, onStart }: { onClose: () => void, onStart: () => void }) {
  const [checking, setChecking] = useState(true);
  
  const [status, setStatus] = useState({
    key: { checked: false, passed: false },
    channels: { checked: false, passed: false },
  });

  useEffect(() => {
    let mounted = true;
    
    async function runChecks() {
      // 1. Check API Key
      try {
        const keyRes = await fetch("/api/key/status");
        const keyData = await keyRes.json();
        if (!mounted) return;
        setStatus(s => ({ ...s, key: { checked: true, passed: keyData.connected } }));
      } catch {
        if (!mounted) return;
        setStatus(s => ({ ...s, key: { checked: true, passed: false } }));
      }

      // 2. Check Channels
      try {
        const chanRes = await fetch("/api/channels");
        const chanData = await chanRes.json();
        const hasEnabled = chanData.channels?.some((c: any) => c.enabled && c.configured);
        if (!mounted) return;
        setStatus(s => ({ ...s, channels: { checked: true, passed: !!hasEnabled } }));
      } catch {
        if (!mounted) return;
        setStatus(s => ({ ...s, channels: { checked: true, passed: false } }));
      }

      setChecking(false);
    }
    
    runChecks();
    
    return () => {
      mounted = false;
    };
  }, []);

  const allPassed = !checking && status.key.passed && status.channels.passed;

  const CheckItem = ({ 
    label, 
    desc, 
    statusObj, 
    actionLabel, 
    actionHref 
  }: { 
    label: string, 
    desc: string, 
    statusObj: { checked: boolean, passed: boolean },
    actionLabel: string,
    actionHref: string
  }) => (
    <div className="flex items-start justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
      <div className="flex gap-3">
        <div className="mt-0.5">
          {!statusObj.checked ? (
            <CircleNotch className="w-5 h-5 text-white animate-spin" />
          ) : statusObj.passed ? (
            <CheckCircle className="w-5 h-5 text-[#2DD4BF]" weight="fill" />
          ) : (
            <WarningCircle className="w-5 h-5 text-red-400" weight="bold" />
          )}
        </div>
        <div>
          <p className="text-[14px] font-bold text-white">{label}</p>
          <p className="text-[12px] text-neutral-400 mt-0.5">{desc}</p>
        </div>
      </div>
      {statusObj.checked && !statusObj.passed && (
        <Link 
          href={actionHref}
          onClick={onClose}
          className="text-[12px] font-bold text-black bg-white border border-white/20 px-3 py-1.5 rounded-lg shadow-sm hover:bg-neutral-200 flex items-center gap-1 shrink-0 transition-colors"
        >
          {actionLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[8px] animate-[fade-in_150ms_ease]" 
        onClick={onClose}
      />
      <div className="fixed z-[110] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[440px] liquid-glass bg-black/95 border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.5)] rounded-2xl p-6 animate-[fade-slide-down_200ms_ease]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-[20px] font-sans font-bold text-white mb-1">
              Preflight Check
            </h3>
            <p className="text-[13px] font-sans text-neutral-400">
              Verifying system readiness before going live.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-8">
          <CheckItem 
            label="API Key Connected" 
            desc="Required for Sarvam translation services."
            statusObj={status.key}
            actionLabel="Connect Key"
            actionHref="/settings"
          />
          <CheckItem 
            label="Active Destination" 
            desc="At least one channel must be enabled."
            statusObj={status.channels}
            actionLabel="Add Channel"
            actionHref="/channels"
          />
        </div>

        <button
          onClick={onStart}
          disabled={!allPassed}
          className={`w-full py-3.5 rounded-full text-[15px] font-bold transition-all flex items-center justify-center gap-2
            ${allPassed 
              ? "bg-white text-black hover:bg-neutral-200" 
              : "bg-white/10 text-neutral-500 cursor-not-allowed"}`}
        >
          {!allPassed ? (
            "Checks failed"
          ) : (
            <>
              All Set — Close
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2DD4BF] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2DD4BF]"></span>
              </span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
