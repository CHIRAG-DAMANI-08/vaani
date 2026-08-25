"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash,
  Check,
  X,
  SpinnerGap,
  Radio,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { useCSRF } from "@/lib/use-csrf";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { IconButton } from "../../../components/ui/IconButton";
import { Toggle } from "../../../components/ui/Toggle";

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
  const { csrfToken } = useCSRF();
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRtmpUrl, setEditRtmpUrl] = useState("");
  const [editRtmpKey, setEditRtmpKey] = useState("");
  const [editEnabled, setEditEnabled] = useState(false);
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
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || "",
        },
        body: JSON.stringify({
          languageId,
          rtmpUrl: editRtmpUrl || null,
          rtmpKey: editRtmpKey || null,
          enabled: editEnabled,
        }),
      });

      if (res.ok) {
        setEditingId(null);
        setEditRtmpUrl("");
        setEditRtmpKey("");
        setEditEnabled(false);
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
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || "",
        },
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
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || "",
        },
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
    setEditEnabled(ch.enabled);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRtmpUrl("");
    setEditRtmpKey("");
    setEditEnabled(false);
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
          <SpinnerGap className="w-5 h-5 text-gray-400 animate-spin" weight="bold" />
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
                        <Radio className="w-4 h-4 text-gray-400 shrink-0" weight="bold" />
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
                        <Toggle
                          checked={ch.enabled}
                          onChange={() => handleToggle(ch)}
                          label="Enabled"
                        />

                        <div className="ml-auto flex gap-2">
                          <IconButton
                            icon={Pencil}
                            ariaLabel={`Edit ${ch.name} channel`}
                            onClick={() => startEdit(ch)}
                          />
                          <IconButton
                            icon={Trash}
                            ariaLabel={`Delete ${ch.name} channel`}
                            variant="danger"
                            onClick={() => setDeleteConfirm(ch.id)}
                          />
                        </div>
                      </div>

                      {/* Delete confirmation modal */}
                      <Modal
                        open={isDeleting}
                        onClose={() => setDeleteConfirm(null)}
                        title="Remove channel"
                        description="The RTMP key will be deleted for this channel."
                        footer={
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(ch.id)}
                            >
                              Remove
                            </Button>
                          </>
                        }
                      >
                        <p className="text-[13px] font-dm-sans text-gray-600">
                          Are you sure you want to remove <strong>{ch.name}</strong>?
                          The RTMP key will be permanently deleted.
                        </p>
                      </Modal>
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
                          <Plus className="w-4 h-4" weight="bold" />
                          <span className="text-[13px] font-dm-sans font-medium">
                            Configure channel
                          </span>
                        </button>
                      )}

                      {isEditing && (
                        <div className="space-y-3 animate-[fade-slide-up_200ms_ease-out_forwards] opacity-0">
                          {/* RTMP URL */}
                          <Input
                            label="RTMP URL"
                            value={editRtmpUrl}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditRtmpUrl(e.target.value)}
                            placeholder="rtmp://a.rtmp.youtube.com/live2"
                          />

                          {/* RTMP Key */}
                          <Input
                            label="Stream key"
                            type="password"
                            value={editRtmpKey}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditRtmpKey(e.target.value)}
                            placeholder={
                              ch.hasRtmpKey
                                ? "Enter new key to replace..."
                                : "Paste your stream key..."
                            }
                            hint={
                              ch.hasRtmpKey && !editRtmpKey
                                ? "Stream key set (last 4: XXXX)"
                                : undefined
                            }
                          />

                          {/* Enabled toggle */}
                          <Toggle
                            checked={editEnabled}
                            onChange={setEditEnabled}
                            label="Enabled"
                            description="Enable this channel for streaming"
                          />

                          {/* Help link */}
                          <a
                            href="https://support.google.com/youtube/answer/2907883"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-dm-sans text-[#F5821F] hover:text-[#E8690A] inline-flex items-center gap-1 transition-colors"
                          >
                            Where to find your stream key{" "}
                            <ArrowSquareOut className="w-3 h-3" weight="bold" />
                          </a>

                          {/* Action buttons */}
                          <div className="flex gap-2 pt-1">
                            <Button
                              variant="primary"
                              size="md"
                              loading={saving}
                              disabled={!editRtmpKey && !ch.hasRtmpKey}
                              icon={Check}
                              onClick={() => handleSave(ch.id)}
                            >
                              {saving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="md"
                              icon={X}
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
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
