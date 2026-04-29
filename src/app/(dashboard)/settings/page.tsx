"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Eye,
  EyeOff,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  Trash2,
  RefreshCw,
  KeyRound,
  ShieldAlert,
  X,
} from "lucide-react";
import { useCSRF } from "@/lib/use-csrf";
import { OBSConnectionSection } from "./OBSConnectionSection";
import { StreamSettingsSection } from "./StreamSettingsSection";
import { TTSSettingsSection } from "./TTSSettingsSection";

type KeyStatus =
  | { connected: false }
  | { connected: true; masked: string; updatedAt: string | null };

type SectionState = "view" | "edit" | "add" | "removing";
type ActionState = "idle" | "loading" | "success" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  KEY_FORMAT_INVALID:
    "Your key should only contain letters, numbers, hyphens, and underscores.",
  KEY_INVALID:
    "This key wasn't accepted by Sarvam. Check it's copied correctly.",
  SARVAM_UNREACHABLE:
    "Couldn't reach Sarvam right now. Your existing key is still active.",
  RATE_LIMIT_EXCEEDED: "Too many attempts. Try again in",
  CSRF_INVALID: "Something went wrong. Please refresh and try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

function formatDate(iso: string | null): string {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function SettingsPage() {
  // Fetch key status
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Section UI state
  const [sectionState, setSectionState] = useState<SectionState>("view");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Key input
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Remove confirmation dialog
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const { csrfToken, refreshToken } = useCSRF();

  const canSubmit =
    newKey.trim().length >= 20 &&
    newKey.trim().length <= 200 &&
    actionState !== "loading" &&
    countdown === 0;

  // ── Fetch key status ──
  const fetchKeyStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/key/status");
      const data = await res.json();
      if (res.ok) {
        setKeyStatus(data as KeyStatus);
      }
    } catch (err) {
      console.error("[settings] Failed to fetch key status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeyStatus();
  }, [fetchKeyStatus]);

  // ── Countdown timer ──
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            setErrorCode(null);
            setActionState("idle");
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
  }, [countdown]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Save/Validate key ──
  const handleSaveKey = async () => {
    if (!canSubmit) return;

    setActionState("loading");
    setErrorCode(null);

    const endpoint =
      sectionState === "edit" ? "/api/key/update" : "/api/key/validate";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || "",
        },
        body: JSON.stringify({ key: newKey.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setActionState("success");
        // Reset after a beat
        setTimeout(() => {
          setSectionState("view");
          setActionState("idle");
          setNewKey("");
          setShowKey(false);
          fetchKeyStatus();
        }, 1000);
        return;
      }

      // Error handling
      setErrorCode(data.error);
      setActionState("error");

      if (data.error === "RATE_LIMIT_EXCEEDED" && data.retryAfterSeconds) {
        setCountdown(data.retryAfterSeconds);
        setActionState("idle");
      }

      if (data.error === "CSRF_INVALID") {
        refreshToken();
      }
    } catch {
      setErrorCode("INTERNAL_ERROR");
      setActionState("error");
    }
  };

  // ── Remove key ──
  const handleRemoveKey = async () => {
    setActionState("loading");

    try {
      const res = await fetch("/api/key", {
        method: "DELETE",
        headers: {
          "x-csrf-token": csrfToken || "",
        },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowRemoveDialog(false);
        setActionState("idle");
        setKeyStatus({ connected: false });
        setSectionState("view");
        return;
      }

      setErrorCode(data.error);
      setActionState("error");
    } catch {
      setErrorCode("INTERNAL_ERROR");
      setActionState("error");
    }
  };

  const handleCancel = () => {
    setSectionState("view");
    setActionState("idle");
    setErrorCode(null);
    setNewKey("");
    setShowKey(false);
    setCountdown(0);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").trim();
    setNewKey(text);
    setErrorCode(null);
    setActionState("idle");
  };

  return (
    <div className="space-y-8 max-w-7xl pt-2">
      {/* Page Header */}
      <div>
        <h1 className="text-[32px] font-syne font-bold text-gray-900 tracking-tight">
          Settings
        </h1>
        <p className="text-[14px] text-gray-500 font-dm-sans mt-1">
          Manage API keys and streaming configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          {/* ── Sarvam API Key Section ── */}
      <section className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_12px_40px_rgba(0,0,0,0.03)] rounded-[28px] overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#FFF2E5] flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-[#F5821F]" />
            </div>
            <div>
              <h2 className="text-[16px] font-syne font-bold text-gray-900">
                Sarvam API Key
              </h2>
              <p className="text-[12px] font-dm-sans text-gray-400">
                Used for speech-to-text, translation, and text-to-speech
              </p>
            </div>
          </div>
          <a
            href="https://dashboard.sarvam.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-dm-sans font-medium text-[#F5821F] hover:text-[#E8690A] inline-flex items-center gap-1 transition-colors"
          >
            Get keys <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="px-8 py-6">
          {loading ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              <p className="text-[13px] text-gray-400 font-dm-sans">
                Checking key status...
              </p>
            </div>
          ) : keyStatus?.connected && sectionState === "view" ? (
            /* ── State A: Key Connected ── */
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p
                    className="text-[14px] text-gray-900 font-medium"
                    style={{ fontFamily: "var(--font-jetbrains)" }}
                  >
                    {keyStatus.masked}
                  </p>
                </div>
                <p className="text-[12px] font-dm-sans text-gray-400">
                  Last updated{" "}
                  {keyStatus.updatedAt
                    ? formatDate(keyStatus.updatedAt)
                    : "—"}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSectionState("edit");
                    setNewKey("");
                    setErrorCode(null);
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                  className="px-5 py-2.5 rounded-[14px] text-[13px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:shadow-sm active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Update key
                </button>
                <button
                  onClick={() => setShowRemoveDialog(true)}
                  className="px-5 py-2.5 rounded-[14px] text-[13px] font-semibold text-[#EF4444] bg-[#FEF2F2] border border-[#FEE2E2] hover:bg-[#FEE2E2] active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove key
                </button>
              </div>
            </div>
          ) : !keyStatus?.connected && sectionState === "view" ? (
            /* ── State B: No Key Connected ── */
            <div>
              <div className="flex items-center gap-3 mb-4 p-4 rounded-[16px] bg-[#FFFBEB] border border-[#FDE68A]/50">
                <ShieldAlert className="w-5 h-5 text-[#F59E0B] shrink-0" />
                <p className="text-[13px] font-dm-sans text-[#92400E]">
                  No API key connected. Vaani cannot translate your streams
                  without a Sarvam API key.
                </p>
              </div>
              <button
                onClick={() => {
                  setSectionState("add");
                  setNewKey("");
                  setErrorCode(null);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className="px-6 py-3 rounded-[16px] text-[14px] font-semibold bg-gray-900 text-white hover:bg-gray-800 shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all"
              >
                Add key
              </button>
            </div>
          ) : (
            /* ── State C: Edit / Add Mode ── */
            <div>
              {/* Show current key if editing */}
              {sectionState === "edit" && keyStatus?.connected && (
                <p className="text-[12px] font-dm-sans text-gray-400 mb-3">
                  Current key:{" "}
                  <span style={{ fontFamily: "var(--font-jetbrains)" }}>
                    {keyStatus.masked}
                  </span>
                </p>
              )}

              {/* New key input */}
              <div className="relative mb-2">
                <input
                  ref={inputRef}
                  type={showKey ? "text" : "password"}
                  value={newKey}
                  onChange={(e) => {
                    setNewKey(e.target.value);
                    if (errorCode) {
                      setErrorCode(null);
                      setActionState("idle");
                    }
                  }}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveKey();
                  }}
                  placeholder={
                    sectionState === "edit"
                      ? "Paste new key..."
                      : "sk_live_..."
                  }
                  disabled={
                    actionState === "loading" ||
                    actionState === "success" ||
                    countdown > 0
                  }
                  className={`w-full rounded-[16px] border px-4 py-3.5 pr-12 text-[13px] text-gray-900 bg-gray-50/50 outline-none transition-all duration-200 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#F5821F]/15 ${
                    actionState === "error"
                      ? "border-[#EF4444] focus:border-[#EF4444]"
                      : actionState === "success"
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
                  {actionState === "success" ? (
                    <Check className="w-4 h-4 text-[#10B981]" />
                  ) : showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Error area */}
              <div className="h-[36px] flex items-start mb-2">
                {errorCode && (
                  <div className="flex items-start gap-2 animate-[fade-in_150ms_ease]">
                    <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                    <p className="text-[12px] font-dm-sans text-[#EF4444] leading-[1.5]">
                      {ERROR_MESSAGES[errorCode] || "Something went wrong."}
                      {errorCode === "RATE_LIMIT_EXCEEDED" &&
                        countdown > 0 && (
                          <span className="font-mono font-bold ml-1">
                            {formatCountdown(countdown)}
                          </span>
                        )}
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveKey}
                  disabled={!canSubmit}
                  className={`px-6 py-3 rounded-[16px] text-[14px] font-semibold transition-all duration-300 flex items-center gap-2 ${
                    actionState === "success"
                      ? "bg-[#10B981] text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
                      : actionState === "loading"
                      ? "bg-gray-900 text-white opacity-80"
                      : canSubmit
                      ? "bg-gray-900 text-white hover:bg-gray-800 shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-[0.98]"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {actionState === "loading" && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {actionState === "success" && (
                    <Check className="w-4 h-4" />
                  )}
                  {actionState === "loading"
                    ? "Validating..."
                    : actionState === "success"
                    ? "Saved!"
                    : sectionState === "edit"
                    ? "Save new key"
                    : "Validate and save"}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 rounded-[14px] text-[14px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
          </section>

          <OBSConnectionSection csrfToken={csrfToken || ""} refreshToken={refreshToken} />
        </div>
        
        <div className="space-y-6">
          <StreamSettingsSection />
          <TTSSettingsSection />
        </div>
      </div>

      {/* ── Remove Key Confirmation Dialog ── */}
      {showRemoveDialog && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[8px] animate-[fade-in_150ms_ease]" />
          <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] bg-white/95 backdrop-blur-xl border border-white shadow-[0_32px_80px_rgba(0,0,0,0.12)] rounded-[28px] p-8">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-[20px] font-syne font-bold text-gray-900">
                Remove API key?
              </h3>
              <button
                onClick={() => {
                  setShowRemoveDialog(false);
                  setActionState("idle");
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[14px] font-dm-sans text-gray-500 leading-[1.6] mb-4">
              Vaani will no longer be able to translate your streams. You can
              reconnect a key at any time from Settings.
            </p>

            <div className="flex items-center gap-2 p-3 rounded-[12px] bg-[#FFFBEB] border border-[#FDE68A]/50 mb-7">
              <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <p className="text-[12px] font-dm-sans text-[#92400E]">
                Any active streams will stop immediately.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRemoveDialog(false);
                  setActionState("idle");
                }}
                className="px-5 py-2.5 rounded-[14px] text-[14px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
              >
                Keep key
              </button>
              <button
                onClick={handleRemoveKey}
                disabled={actionState === "loading"}
                className="px-6 py-3 rounded-[16px] text-[14px] font-semibold bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-[0_4px_12px_rgba(239,68,68,0.25)] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                {actionState === "loading" && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Remove key
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
