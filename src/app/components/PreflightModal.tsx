"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
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
    <div className="flex items-start justify-between p-4 rounded-[16px] bg-gray-50/50 border border-gray-100">
      <div className="flex gap-3">
        <div className="mt-0.5">
          {!statusObj.checked ? (
            <Loader2 className="w-5 h-5 text-[#F5821F] animate-spin" />
          ) : statusObj.passed ? (
            <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#EF4444]" />
          )}
        </div>
        <div>
          <p className="text-[14px] font-bold text-gray-900">{label}</p>
          <p className="text-[12px] text-gray-500 mt-0.5">{desc}</p>
        </div>
      </div>
      {statusObj.checked && !statusObj.passed && (
        <Link 
          href={actionHref}
          onClick={onClose}
          className="text-[12px] font-bold text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-1 shrink-0"
        >
          {actionLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[8px] animate-[fade-in_150ms_ease]" 
        onClick={onClose}
      />
      <div className="fixed z-[110] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[440px] bg-white/95 backdrop-blur-xl border border-white shadow-[0_32px_80px_rgba(0,0,0,0.12)] rounded-[28px] p-6 animate-[scale-in_150ms_ease-out]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-[20px] font-syne font-bold text-gray-900 mb-1">
              Preflight Check
            </h3>
            <p className="text-[13px] font-dm-sans text-gray-500">
              Verifying system readiness before going live.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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
          className={`w-full py-3.5 rounded-[16px] text-[15px] font-bold transition-all shadow-sm flex items-center justify-center gap-2
            ${allPassed 
              ? "bg-[#10B981] text-white hover:bg-[#059669] shadow-[#10B981]/20" 
              : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
        >
          {!allPassed ? (
            "Checks failed"
          ) : (
            <>
              Ready — Go Live in OBS
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
