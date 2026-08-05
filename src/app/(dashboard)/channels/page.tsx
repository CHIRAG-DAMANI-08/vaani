"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Radio,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/app/components/GlassCard";

type ChannelData = {
  id: string;
  name: string;
  script: string;
  color: string;
  enabled: boolean;
  configured: boolean;
  rtmpUrl: string | null;
  hasRtmpKey: boolean;
  updatedAt: string | null;
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRtmpUrl, setEditRtmpUrl] = useState("");
  const [editRtmpKey, setEditRtmpKey] = useState("");
  const [showRtmpKey, setShowRtmpKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch (err) {
      logger.error({ err }, "Channels fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleSave = async (languageId: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageId,
          rtmpUrl: editRtmpUrl || null,
          rtmpKey: editRtmpKey || null,
          enabled:
            !!editRtmpKey ||
            (!editRtmpKey &&
            channels.find((c) => c.id === languageId)?.hasRtmpKey
              ? channels.find((c) => c.id === languageId)?.enabled
              : false),
        }),
      });

      if (res.ok) {
        setEditingId(null);
        setEditRtmpUrl("");
        setEditRtmpKey("");
        setShowRtmpKey(false);
        fetchChannels();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save channel. Please try again.");
      }
    } catch (err) {
      logger.error({ err }, "Channel save failed");
      toast.error("Failed to save channel. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ch: ChannelData) => {
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageId: ch.id,
          enabled: !ch.enabled,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to update channel.");
      }
      fetchChannels();
    } catch (err) {
      logger.error({ err }, "Channel toggle failed");
      toast.error("Failed to update channel.");
    }
  };

  const handleDelete = async (languageId: string) => {
    try {
      const res = await fetch("/api/channels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageId }),
      });
      if (!res.ok) {
        toast.error("Failed to delete channel.");
      }
      setDeleteConfirm(null);
      fetchChannels();
    } catch (err) {
      logger.error({ err }, "Channel delete failed");
      toast.error("Failed to delete channel.");
    }
  };

  const startEdit = (ch: ChannelData) => {
    setEditingId(ch.id);
    setEditRtmpUrl(ch.rtmpUrl || "");
    setEditRtmpKey("");
    setShowRtmpKey(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRtmpUrl("");
    setEditRtmpKey("");
    setShowRtmpKey(false);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight leading-none">
          Chan<span className="font-serif italic font-normal">nels</span>
        </h1>
        <p className="text-sm font-sans text-neutral-400 mt-2">
          Configure language channels for your multilingual pipeline.
        </p>
      </div>

      {/* Channels List */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
          <p className="text-xs text-neutral-400 font-sans">
            Loading channels...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {channels.map((ch, idx) => {
            const isEditing = editingId === ch.id;
            const isDeleting = deleteConfirm === ch.id;
            const displayScript = ch.script || ch.name || "A";
            const firstChar = displayScript.charAt(0);

            return (
              <GlassCard
                key={ch.id}
                delay={idx * 0.05}
                className="flex flex-col"
              >
                {/* Channel Header */}
                <div className="p-6 pb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    {/* Language script tile */}
                    <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-sans font-bold text-lg text-white shrink-0">
                      {firstChar}
                    </div>

                    <div>
                      <h3 className="font-serif italic text-2xl font-normal text-white leading-tight">
                        {displayScript}
                      </h3>
                      <p className="text-xs font-sans text-neutral-400 mt-0.5">
                        {ch.name}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`text-xs font-sans font-medium px-2.5 py-1 rounded-full ${
                      ch.configured && ch.enabled
                        ? "border border-[#2DD4BF]/40 text-[#2DD4BF] bg-transparent"
                        : ch.configured
                        ? "border border-white/15 text-neutral-400 bg-transparent"
                        : "border border-dashed border-white/20 text-neutral-500 bg-transparent"
                    }`}
                  >
                    {ch.configured && ch.enabled
                      ? "Active"
                      : ch.configured
                      ? "Paused"
                      : "Setup"}
                  </span>
                </div>

                <div className="px-6 pb-6 mt-auto">
                  {/* Configured View */}
                  {ch.configured && !isEditing && (
                    <div className="space-y-4">
                      {/* RTMP Row in bordered inset box */}
                      <div className="liquid-glass border border-white/10 rounded-xl p-3 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-neutral-400 shrink-0" strokeWidth={1.6} />
                        <p className="font-mono text-xs text-neutral-300 truncate">
                          {ch.rtmpUrl || "rtmp://a.rtmp.youtube.com/live2"}
                        </p>
                        <span className="text-xs text-[#2DD4BF] font-medium ml-auto shrink-0 flex items-center gap-1">
                          ✓ Key saved
                        </span>
                      </div>

                      {/* Toggle & Action Buttons */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-3">
                          {/* Switch toggle */}
                          <button
                            onClick={() => handleToggle(ch)}
                            className={`w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer ${
                              ch.enabled ? "bg-white" : "bg-neutral-800"
                            }`}
                          >
                            <div
                              className={`absolute top-0.5 w-4 h-4 bg-black rounded-full transition-transform duration-200 ${
                                ch.enabled ? "translate-x-5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                          <span className="text-xs font-sans text-neutral-400">
                            {ch.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(ch)}
                            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" strokeWidth={1.6} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(ch.id)}
                            className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.6} />
                          </button>
                        </div>
                      </div>

                      {/* Delete confirmation inline */}
                      {isDeleting && (
                        <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 space-y-2 mt-2">
                          <p className="text-xs font-sans text-red-200">
                            Remove this channel? The RTMP key will be deleted.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(ch.id)}
                              className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                              Remove
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1 rounded-full text-xs font-medium text-neutral-400 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Unconfigured (Setup) or Editing */}
                  {(!ch.configured || isEditing) && (
                    <div className="space-y-3">
                      {!isEditing && !ch.configured && (
                        <button
                          onClick={() => startEdit(ch)}
                          className="w-full py-3.5 border border-dashed border-white/20 hover:border-white/40 rounded-xl text-xs font-medium text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" strokeWidth={1.6} />
                          <span>Configure channel</span>
                        </button>
                      )}

                      {isEditing && (
                        <div className="space-y-3 pt-1">
                          {/* RTMP Server URL */}
                          <div>
                            <label className="text-[11px] font-sans font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">
                              RTMP Server URL
                            </label>
                            <input
                              type="text"
                              value={editRtmpUrl}
                              onChange={(e) => setEditRtmpUrl(e.target.value)}
                              placeholder="rtmp://a.rtmp.youtube.com/live2"
                              className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-xs text-white outline-none font-mono placeholder:text-neutral-600 focus:border-white/30 transition-all"
                            />
                          </div>

                          {/* Stream Key */}
                          <div>
                            <label className="text-[11px] font-sans font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">
                              Stream Key
                            </label>
                            <div className="relative">
                              <input
                                type={showRtmpKey ? "text" : "password"}
                                value={editRtmpKey}
                                onChange={(e) => setEditRtmpKey(e.target.value)}
                                placeholder={
                                  ch.hasRtmpKey
                                    ? "Enter new key to replace..."
                                    : "Paste your stream key..."
                                }
                                className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 pr-10 text-xs text-white outline-none font-mono placeholder:text-neutral-600 focus:border-white/30 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowRtmpKey(!showRtmpKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                                tabIndex={-1}
                              >
                                {showRtmpKey ? (
                                  <EyeOff className="w-4 h-4" strokeWidth={1.6} />
                                ) : (
                                  <Eye className="w-4 h-4" strokeWidth={1.6} />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Help Link */}
                          <a
                            href="https://support.google.com/youtube/answer/2907883"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-sans text-neutral-400 hover:text-white inline-flex items-center gap-1 transition-colors"
                          >
                            Where to find your stream key{" "}
                            <ExternalLink className="w-3 h-3" strokeWidth={1.6} />
                          </a>

                          {/* Form Action Buttons */}
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => handleSave(ch.id)}
                              disabled={saving || (!editRtmpKey && !ch.hasRtmpKey)}
                              className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-2"
                            >
                              {saving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" strokeWidth={1.6} />
                              )}
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-4 py-2 rounded-full text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" strokeWidth={1.6} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
