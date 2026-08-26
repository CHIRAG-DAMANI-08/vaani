"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleNotch, CheckCircle, WarningCircle, YoutubeLogo, VideoCamera, Key } from "@phosphor-icons/react";
import { joinBeta } from "@/app/actions/join-beta";
import { InterestPillGroup } from "./InterestPillGroup";

export function BetaApplicationForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [youtubeChannel, setYoutubeChannel] = useState("");
  const [channelData, setChannelData] = useState<{
    handle?: string;
    title?: string;
    subscriberCount?: string;
    avatar?: string | null;
  } | null>(null);
  const [isLookingUpYoutube, setIsLookingUpYoutube] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [obsSetup, setObsSetup] = useState<"using_obs" | "needs_guide">("using_obs");
  const [sarvamPreference, setSarvamPreference] = useState<"need_key" | "bring_own">("need_key");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "review" | "duplicate" | "error">("idle");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [deviceId] = useState(() => (typeof crypto !== "undefined" ? crypto.randomUUID().slice(0, 8) : "dev-cli"));

  // Debounced YouTube channel lookup
  useEffect(() => {
    const trimmed = youtubeChannel.trim();
    if (!trimmed || trimmed.length < 3) {
      setChannelData(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLookingUpYoutube(true);
      try {
        const res = await fetch(`/api/youtube-lookup?channel=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.channel) {
            setChannelData(data.channel);
          }
        }
      } catch {
        // silent fallback
      } finally {
        setIsLookingUpYoutube(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [youtubeChannel]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    const formData = new FormData();
    formData.append("email", email);
    if (name) formData.append("name", name);
    if (youtubeChannel) formData.append("youtubeChannel", youtubeChannel);
    if (channelData?.title) formData.append("channelTitle", channelData.title);
    if (channelData?.subscriberCount) formData.append("subscriberCount", channelData.subscriberCount);
    if (channelData?.avatar) formData.append("channelAvatar", channelData.avatar);
    if (interests.length) formData.append("interests", interests.join(","));
    formData.append("obsSetup", obsSetup);
    formData.append("sarvamPreference", sarvamPreference);
    if (reason) formData.append("reason", reason);
    formData.append("deviceId", deviceId);

    try {
      const response = await joinBeta(null, formData);

      if (response.state === "duplicate") {
        setStatus("duplicate");
      } else if (response.state === "review") {
        setStatus("review");
      } else if (response.state === "success") {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4 liquid-glass p-6 sm:p-8 rounded-3xl border border-white/10 text-white shadow-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="name" className="text-xs font-sans font-semibold text-neutral-300 pl-1">
            First name <span className="text-neutral-500 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            id="name"
            autoComplete="given-name"
            placeholder="Aarav Mehta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={status === "loading"}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-white/40 transition-colors placeholder:text-neutral-500 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-sans font-semibold text-neutral-300 pl-1">
            Email address <span className="text-red-400">*</span>
          </label>
          <input
            ref={emailInputRef}
            type="email"
            id="email"
            required
            autoComplete="email"
            placeholder="creator@youtube.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading"}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-white/40 transition-colors placeholder:text-neutral-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* YouTube Channel Input */}
      <div className="space-y-1.5">
        <label htmlFor="yt-channel" className="text-xs font-sans font-semibold text-neutral-300 pl-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <YoutubeLogo size={15} weight="fill" className="text-red-500" />
            YouTube Channel Link or @Handle
          </span>
          {isLookingUpYoutube && (
            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <CircleNotch size={11} className="animate-spin text-[#2DD4BF]" /> Looking up...
            </span>
          )}
        </label>
        <input
          type="text"
          id="yt-channel"
          placeholder="e.g. youtube.com/@aaravplays or @aaravplays"
          value={youtubeChannel}
          onChange={(e) => setYoutubeChannel(e.target.value)}
          disabled={status === "loading"}
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-white/40 transition-colors placeholder:text-neutral-500 disabled:opacity-50"
        />

        {/* Live Detected YouTube Details Card */}
        {channelData && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs"
          >
            {channelData.avatar ? (
              <img src={channelData.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-white/20" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
                ▶
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{channelData.title}</p>
              <p className="text-[11px] text-neutral-400 font-mono">{channelData.subscriberCount || "Creator"}</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#2DD4BF]/10 text-[#2DD4BF] text-[10px] font-semibold border border-[#2DD4BF]/20">
              Verified
            </span>
          </motion.div>
        )}
      </div>

      {/* Target Languages */}
      <div className="space-y-1.5">
        <label className="text-xs font-sans font-semibold text-neutral-300 pl-1">
          Languages you stream to <span className="text-neutral-500 font-normal">(Select all that apply)</span>
        </label>
        <InterestPillGroup selected={interests} onChange={setInterests} />
      </div>

      {/* Setup Preferences (OBS & Sarvam Key) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* OBS Setup */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-sans font-semibold text-neutral-300 pl-1 flex items-center gap-1.5">
            <VideoCamera size={13} className="text-neutral-400" />
            OBS Studio Setup
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setObsSetup("using_obs")}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer text-center ${
                obsSetup === "using_obs"
                  ? "bg-white text-black border-white shadow-sm"
                  : "liquid-glass border-white/10 text-neutral-400 hover:text-white"
              }`}
            >
              ⚡ Using OBS
            </button>
            <button
              type="button"
              onClick={() => setObsSetup("needs_guide")}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer text-center ${
                obsSetup === "needs_guide"
                  ? "bg-white text-black border-white shadow-sm"
                  : "liquid-glass border-white/10 text-neutral-400 hover:text-white"
              }`}
            >
              📖 Need Guide
            </button>
          </div>
        </div>

        {/* Sarvam Key Preference */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-sans font-semibold text-neutral-300 pl-1 flex items-center gap-1.5">
            <Key size={13} className="text-neutral-400" />
            Sarvam AI Key
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSarvamPreference("need_key")}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer text-center ${
                sarvamPreference === "need_key"
                  ? "bg-white text-black border-white shadow-sm"
                  : "liquid-glass border-white/10 text-neutral-400 hover:text-white"
              }`}
            >
              🔑 Need Key
            </button>
            <button
              type="button"
              onClick={() => setSarvamPreference("bring_own")}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer text-center ${
                sarvamPreference === "bring_own"
                  ? "bg-white text-black border-white shadow-sm"
                  : "liquid-glass border-white/10 text-neutral-400 hover:text-white"
              }`}
            >
              💼 Bring Own
            </button>
          </div>
        </div>
      </div>

      {/* Why they want to use Vaani */}
      <div className="flex flex-col gap-1.5 pt-1">
        <label htmlFor="reason" className="text-xs font-sans font-semibold text-neutral-300 pl-1">
          Why do you want to use Vaani? <span className="text-neutral-500 font-normal">(Use-case & Audience)</span>
        </label>
        <textarea
          id="reason"
          rows={2}
          placeholder="e.g. I stream gaming in Hindi but have viewers in South India. Live translated audio channels allow me to reach all of them."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={status === "loading"}
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-white/40 transition-colors placeholder:text-neutral-500 disabled:opacity-50 resize-none"
        />
      </div>

      <AnimatePresence mode="popLayout">
        {status === "error" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-sans text-red-400">
            <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <p>Something went wrong. Please check your connection and try again.</p>
          </motion.div>
        )}
        {status === "duplicate" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-sans text-amber-400">
            <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <p>You&apos;ve already applied. We&apos;ll notify you when it&apos;s your turn!</p>
          </motion.div>
        )}
        {status === "review" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-sans text-blue-400">
            <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <p>Application submitted. Pending review — we&apos;ll email you soon.</p>
          </motion.div>
        )}
        {status === "success" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 p-3 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 text-xs font-sans text-[#2DD4BF]">
            <CheckCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
            <p>Application received! We&apos;ll email you as soon as capacity opens.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={status === "loading" || !email}
        className="w-full flex items-center justify-center px-6 py-3.5 text-sm font-bold bg-white text-black rounded-full hover:bg-neutral-200 disabled:opacity-60 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg mt-2"
      >
        {status === "loading" ? (
          <CircleNotch className="animate-spin" size={18} />
        ) : (
          "Apply for Beta Access →"
        )}
      </button>

      <p className="text-[11px] text-center text-neutral-500 px-4">
        By applying, you agree to our Terms of Service and Privacy Policy. We respect your privacy.
      </p>
    </form>
  );
}