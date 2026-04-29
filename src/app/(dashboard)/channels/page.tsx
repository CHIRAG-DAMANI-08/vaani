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
          <h1 className="text-[32px] font-syne font-bold text-gray-900 tracking-tight">
            Channels
          </h1>
          <p className="text-[14px] text-gray-500 font-dm-sans mt-1">
            Configure language channels for your multilingual pipeline.
          </p>
        </div>
      </div>

      {/* Channels List */}
      {loading ? (
        <div className="flex items-center gap-3 py-12 justify-center">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          <p className="text-[13px] text-gray-400 font-dm-sans">
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
                className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_12px_40px_rgba(0,0,0,0.03)] rounded-[28px] overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(0,0,0,0.06)]"
              >
                {/* Channel Header */}
                <div className="px-7 pt-6 pb-4 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {/* Language icon */}
                    <div
                      className="w-12 h-12 rounded-[16px] bg-white shadow-sm flex items-center justify-center relative overflow-hidden"
                    >
                      <div
                        className="absolute inset-0 opacity-10 blur-md"
                        style={{ backgroundColor: ch.color }}
                      />
                      <span
                        className="text-[20px] font-bold z-10"
                        style={{ color: ch.configured ? ch.color : undefined }}
                      >
                        {ch.script.charAt(0)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-[18px] font-syne font-bold text-gray-900">
                        {ch.script}
                      </h3>
                      <p className="text-[13px] font-dm-sans text-gray-500">
                        {ch.name}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`text-[11px] font-dm-sans font-bold px-3 py-1.5 rounded-[10px] ${
                      ch.configured && ch.enabled
                        ? "bg-[#10B981]/10 text-[#10B981]"
                        : ch.configured
                        ? "bg-gray-100 text-gray-500"
                        : "bg-transparent text-gray-400 border border-gray-200 border-dashed"
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
                      <div className="flex items-center gap-2 mb-4 p-3 rounded-[12px] bg-gray-50/80">
                        <Radio className="w-4 h-4 text-gray-400 shrink-0" />
                        <p
                          className="text-[12px] text-gray-500 truncate"
                          style={{ fontFamily: "var(--font-jetbrains)" }}
                        >
                          {ch.rtmpUrl || "RTMP URL configured"}
                        </p>
                        <span className="text-[11px] text-[#10B981] font-medium ml-auto shrink-0">
                          Key saved
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Toggle */}
                        <button
                          onClick={() => handleToggle(ch)}
                          className={`w-[40px] h-[22px] rounded-full relative transition-colors duration-200 ${
                            ch.enabled ? "bg-[#10B981]" : "bg-gray-200"
                          }`}
                        >
                          <div
                            className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                              ch.enabled ? "left-[20px]" : "left-[2px]"
                            }`}
                          />
                        </button>
                        <span className="text-[12px] font-dm-sans text-gray-500">
                          {ch.enabled ? "Enabled" : "Disabled"}
                        </span>

                        <div className="ml-auto flex gap-2">
                          <button
                            onClick={() => startEdit(ch)}
                            className="p-2 rounded-[10px] text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(ch.id)}
                            className="p-2 rounded-[10px] text-gray-400 hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Delete confirmation inline */}
                      {isDeleting && (
                        <div className="mt-3 p-3 rounded-[12px] bg-[#FEF2F2] border border-[#FEE2E2] animate-[fade-in_150ms_ease]">
                          <p className="text-[12px] font-dm-sans text-[#991B1B] mb-2">
                            Remove this channel? The RTMP key will be deleted.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(ch.id)}
                              className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold bg-[#EF4444] text-white hover:bg-[#DC2626] transition-colors"
                            >
                              Remove
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-gray-500 hover:bg-gray-100 transition-colors"
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
                          className="w-full p-4 rounded-[16px] border-2 border-dashed border-gray-200 hover:border-[#F5821F]/40 text-gray-400 hover:text-[#F5821F] transition-all group flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-[13px] font-dm-sans font-medium">
                            Configure channel
                          </span>
                        </button>
                      )}

                      {isEditing && (
                        <div className="space-y-3 animate-[fade-slide-up_200ms_ease-out_forwards] opacity-0">
                          {/* RTMP URL */}
                          <div>
                            <label className="text-[12px] font-dm-sans font-semibold text-gray-600 mb-1.5 block">
                              RTMP Server URL
                            </label>
                            <input
                              type="text"
                              value={editRtmpUrl}
                              onChange={(e) => setEditRtmpUrl(e.target.value)}
                              placeholder="rtmp://a.rtmp.youtube.com/live2"
                              className="w-full rounded-[12px] border border-gray-200 bg-gray-50/50 px-3.5 py-3 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#F5821F]/40 focus:ring-2 focus:ring-[#F5821F]/10 transition-all"
                            />
                          </div>

                          {/* RTMP Key */}
                          <div>
                            <label className="text-[12px] font-dm-sans font-semibold text-gray-600 mb-1.5 block">
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
                                className="w-full rounded-[12px] border border-gray-200 bg-gray-50/50 px-3.5 py-3 pr-10 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#F5821F]/40 focus:ring-2 focus:ring-[#F5821F]/10 transition-all"
                                style={{ fontFamily: "var(--font-jetbrains)" }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowRtmpKey(!showRtmpKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                            className="text-[11px] font-dm-sans text-[#F5821F] hover:text-[#E8690A] inline-flex items-center gap-1 transition-colors"
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
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98] shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
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
                              className="px-4 py-2.5 rounded-[12px] text-[13px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all flex items-center gap-2"
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
