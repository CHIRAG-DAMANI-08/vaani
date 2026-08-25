"use client";

import { useState, useEffect, useCallback } from "react";
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
        setChannels(data.channels);
      }
    } catch (err) {
      console.error("Failed to fetch channels:", err);
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
          enabled: !!(editRtmpKey),
        }),
      });

      if (res.ok) {
        setEditingId(null);
        setEditRtmpUrl("");
        setEditRtmpKey("");
        setShowRtmpKey(false);
        fetchChannels();
      }
    } catch (err) {
      console.error("Failed to save channel:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ch: ChannelData) => {
    try {
      await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageId: ch.id,
          enabled: !ch.enabled,
        }),
      });
      fetchChannels();
    } catch (err) {
      console.error("Failed to toggle channel:", err);
    }
  };

  const handleDelete = async (languageId: string) => {
    try {
      await fetch("/api/channels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageId }),
      });
      setDeleteConfirm(null);
      fetchChannels();
    } catch (err) {
      console.error("Failed to delete channel:", err);
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
    <div className="space-y-8 max-w-[900px] pt-2">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
            Channels
          </h1>
          <p className="text-[14px] text-white/60 mt-1">
            Configure language channels for your multilingual pipeline.
          </p>
        </div>
      </div>

      {/* Channels List */}
      {loading ? (
        <div className="flex items-center gap-3 py-12 justify-center">
          <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
          <p className="text-[13px] text-white/60">
            Loading channels...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {channels.map((ch) => {
            const isEditing = editingId === ch.id;
            const isDeleting = deleteConfirm === ch.id;

            return (
              <div
                key={ch.id}
                className="liquid-glass rounded-[28px] overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* Channel Header */}
                <div className="px-7 pt-6 pb-4 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {/* Language icon */}
                    <div
                      className="w-12 h-12 rounded-[16px] bg-white/5 flex items-center justify-center relative overflow-hidden"
                    >
                      <div
                        className="absolute inset-0 opacity-20 blur-md"
                        style={{ backgroundColor: ch.color }}
                      />
                      <span
                        className="text-[20px] font-bold z-10"
                        style={{ color: ch.configured ? ch.color : "white/60" }}
                      >
                        {ch.script.charAt(0)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-[18px] font-bold text-white">
                        {ch.script}
                      </h3>
                      <p className="text-[13px] text-white/50">
                        {ch.name}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-[10px] ${
                      ch.configured && ch.enabled
                        ? "bg-[hsl(var(--status-live))/0.1] text-[hsl(var(--status-live))]"
                        : ch.configured
                        ? "bg-white/10 text-white/60"
                        : "bg-transparent text-white/40 border border-white/20 border-dashed"
                    }`}
                  >
                    {ch.configured && ch.enabled
                      ? "Active"
                      : ch.configured
                      ? "Paused"
                      : "Setup"}
                  </span>
                </div>

                <div className="px-7 pb-6">
                  {/* ── Configured view ── */}
                  {ch.configured && !isEditing && (
                    <div>
                      <div className="flex items-center gap-2 mb-4 p-3 rounded-[12px] bg-white/5">
                        <Radio className="w-4 h-4 text-white/40 shrink-0" />
                        <p
                          className="text-[12px] text-white/60 truncate"
                        >
                          {ch.rtmpUrl || "RTMP URL configured"}
                        </p>
                        <span className="text-[11px] text-[hsl(var(--accent))] font-medium ml-auto shrink-0">
                          Key saved
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Toggle */}
                        <button
                          onClick={() => handleToggle(ch)}
                          className={`w-[40px] h-[22px] rounded-full relative transition-colors duration-200 ${
                            ch.enabled ? "bg-[hsl(var(--status-live))]" : "bg-white/20"
                          }`}
                        >
                          <div
                            className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                              ch.enabled ? "left-[20px]" : "left-[2px]"
                            }`}
                          />
                        </button>
                        <span className="text-[12px] text-white/50">
                          {ch.enabled ? "Enabled" : "Disabled"}
                        </span>

                        <div className="ml-auto flex gap-2">
                          <button
                            onClick={() => startEdit(ch)}
                            className="p-2 rounded-[10px] text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(ch.id)}
                            className="p-2 rounded-[10px] text-white/40 hover:text-[hsl(var(--status-error))] hover:bg-white/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Delete confirmation inline */}
                      {isDeleting && (
                        <div className="mt-3 p-3 rounded-[12px] bg-white/5 border border-white/10 animate-[fade-in_150ms_ease]">
                          <p className="text-[12px] text-white/80 mb-2">
                            Remove this channel? The RTMP key will be deleted.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(ch.id)}
                              className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold bg-[hsl(var(--status-error))] text-white hover:bg-[hsl(var(--status-error)/0.9)] transition-colors"
                            >
                              Remove
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-white/50 hover:bg-white/10 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Not configured (Setup) or Editing ── */}
                  {(!ch.configured || isEditing) && (
                    <div className="space-y-3">
                      {!isEditing && !ch.configured && (
                        <button
                          onClick={() => startEdit(ch)}
                          className="w-full p-4 rounded-[16px] border-2 border-dashed border-white/20 hover:border-[hsl(var(--accent))/0.4] text-white/40 hover:text-[hsl(var(--accent))] transition-all group flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-[13px] font-medium">
                            Configure channel
                          </span>
                        </button>
                      )}

                      {isEditing && (
                        <div className="space-y-3 animate-[fade-slide-up_200ms_ease-out_forwards] opacity-0">
                          {/* RTMP URL */}
                          <div>
                            <label className="text-[12px] font-semibold text-white/60 mb-1.5 block">
                              RTMP Server URL
                            </label>
                            <input
                              type="text"
                              value={editRtmpUrl}
                              onChange={(e) => setEditRtmpUrl(e.target.value)}
                              placeholder="rtmp://a.rtmp.youtube.com/live2"
                              className="w-full rounded-[12px] border border-white/10 bg-white/5 px-3.5 py-3 text-[13px] text-white outline-none placeholder:text-white/40 focus:border-[hsl(var(--accent)/0.4)] focus:ring-2 focus:ring-[hsl(var(--accent)/0.2)] transition-all"
                            />
                          </div>

                          {/* RTMP Key */}
                          <div>
                            <label className="text-[12px] font-semibold text-white/60 mb-1.5 block">
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
                                className="w-full rounded-[12px] border border-white/10 bg-white/5 px-3.5 py-3 pr-10 text-[13px] text-white outline-none placeholder:text-white/40 focus:border-[hsl(var(--accent)/0.4)] focus:ring-2 focus:ring-[hsl(var(--accent)/0.2)] transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowRtmpKey(!showRtmpKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                                tabIndex={-1}
                              >
                                {showRtmpKey ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Help link */}
                          <a
                            href="https://support.google.com/youtube/answer/2907883"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[hsl(var(--accent))] hover:text-[hsl(var(--accent)/0.8)] inline-flex items-center gap-1 transition-colors"
                          >
                            Where to find your stream key{" "}
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          {/* Action buttons */}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleSave(ch.id)}
                              disabled={saving || (!editRtmpKey && !ch.hasRtmpKey)}
                              className={`px-4 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all flex items-center gap-2 ${
                                saving || (!editRtmpKey && !ch.hasRtmpKey)
                                  ? "bg-white/5 text-white/40 cursor-not-allowed"
                                  : "bg-[hsl(var(--accent))] text-white hover:bg-[hsl(var(--accent)/0.9)] active:scale-[0.98] shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                              }`}
                            >
                              {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-4 py-2.5 rounded-[12px] text-[13px] font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}