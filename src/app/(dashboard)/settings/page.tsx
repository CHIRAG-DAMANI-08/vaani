"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "@/lib/logger";
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
  X,
} from "lucide-react";
import { useCSRF } from "@/lib/use-csrf";
import { OBSConnectionSection } from "./OBSConnectionSection";
import { StreamSettingsSection } from "./StreamSettingsSection";
import { TTSSettingsSection } from "./TTSSettingsSection";
import { GlassCard } from "@/app/components/GlassCard";

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
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [sectionState, setSectionState] = useState<SectionState>("view");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const { csrfToken, refreshToken } = useCSRF();

  const canSubmit =
    newKey.trim().length >= 20 &&
    newKey.trim().length <= 200 &&
    actionState !== "loading" &&
    countdown === 0;

  const fetchKeyStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/key/status");
      const data = await res.json();
      if (res.ok) {
        setKeyStatus(data as KeyStatus);
      }
    } catch (err) {
      logger.error({ err }, "Key status fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeyStatus();
  }, [fetchKeyStatus]);

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
        setTimeout(() => {
          setSectionState("view");
          setActionState("idle");
          setNewKey("");
          setShowKey(false);
          fetchKeyStatus();
        }, 1000);
        return;
      }

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

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight leading-none">
          Set<span className="font-serif italic font-normal">tings</span>
        </h1>
        <p className="text-sm font-sans text-neutral-400 mt-2">
          Manage API keys and streaming configuration.
        </p>
      </div>

      {/* 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Sarvam API Key */}
        <GlassCard className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-white/10 flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0">
                <KeyRound className="w-4 h-4" strokeWidth={1.6} />
              </div>
              <div>
                <h2 className="text-base font-sans font-bold text-white tracking-tight">
                  Sarvam API Key
                </h2>
                <p className="text-xs font-sans text-neutral-400 mt-0.5">
                  Used for speech recognition, translation, and TTS.
                </p>
              </div>
            </div>
            <a
              href="https://dashboard.sarvam.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-sans text-neutral-400 hover:text-white inline-flex items-center gap-1 transition-colors shrink-0"
            >
              Get keys <ExternalLink className="w-3 h-3" strokeWidth={1.6} />
            </a>
          </div>

          {/* Body */}
          <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
              </div>
            ) : sectionState === "view" && keyStatus?.connected ? (
              <div className="space-y-4 my-auto">
                <div className="liquid-glass border border-white/10 rounded-xl p-4 space-y-1">
                  <span className="font-mono text-xs text-white">
                    {keyStatus.masked}
                  </span>
                  <p className="text-[11px] font-sans text-neutral-500">
                    Last updated {formatDate(keyStatus.updatedAt)}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setSectionState("edit")}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.6} />
                    Update Key
                  </button>
                  <button
                    onClick={() => setShowRemoveDialog(true)}
                    className="px-4 py-2 rounded-full text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-950/30 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                    Remove Key
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 my-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-sans font-semibold text-neutral-400 uppercase tracking-wider block">
                    {sectionState === "edit" ? "New API Key" : "Enter API Key"}
                  </label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type={showKey ? "text" : "password"}
                      value={newKey}
                      onChange={(e) => {
                        setNewKey(e.target.value);
                        setErrorCode(null);
                      }}
                      placeholder="Paste your Sarvam API key..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 pr-10 text-xs font-mono text-white outline-none focus:border-white/30 transition-all placeholder:text-neutral-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4" strokeWidth={1.6} />
                      ) : (
                        <Eye className="w-4 h-4" strokeWidth={1.6} />
                      )}
                    </button>
                  </div>
                </div>

                {errorCode && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs font-sans text-red-300">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" strokeWidth={1.6} />
                    <span>{ERROR_MESSAGES[errorCode] || errorCode}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    disabled={!canSubmit}
                    onClick={handleSaveKey}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-2"
                  >
                    {actionState === "loading" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" strokeWidth={1.6} />
                    )}
                    {actionState === "loading" ? "Validating..." : "Save Key"}
                  </button>
                  {keyStatus?.connected && (
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 rounded-full text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Card 2: Stream Settings */}
        <StreamSettingsSection />

        {/* Card 3: OBS Connection */}
        <OBSConnectionSection
          csrfToken={csrfToken || ""}
          refreshToken={refreshToken}
        />

        {/* Card 4: Voice & Language */}
        <TTSSettingsSection />
      </div>

      {/* Remove Key Dialog */}
      {showRemoveDialog && (
        <>
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md liquid-glass bg-black/95 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-sans font-bold text-white">
                Remove Sarvam API Key?
              </h3>
              <button
                onClick={() => setShowRemoveDialog(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" strokeWidth={1.6} />
              </button>
            </div>
            <p className="text-xs font-sans text-neutral-400 leading-relaxed">
              Removing your API key will stop speech recognition, translation, and TTS processing across all streams.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRemoveDialog(false)}
                className="px-4 py-2 rounded-full text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10"
              >
                Keep Key
              </button>
              <button
                onClick={handleRemoveKey}
                disabled={actionState === "loading"}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-red-500 text-white hover:bg-red-600 flex items-center gap-2"
              >
                {actionState === "loading" && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Remove Key
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
