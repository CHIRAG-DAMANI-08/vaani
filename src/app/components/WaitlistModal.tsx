"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, WarningCircle, CircleNotch, YoutubeLogo, VideoCamera, Key, Question } from "@phosphor-icons/react";
import { joinBeta } from "@/app/actions/join-beta";
import { InterestPillGroup } from "./InterestPillGroup";

export const WaitlistModal = () => {
  const [isOpen, setIsOpen] = useState(false);
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
  const [deviceId] = useState(() => (typeof crypto !== "undefined" ? crypto.randomUUID().slice(0, 8) : "dev-cli"));
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ email?: string }>;
      const incomingEmail = customEvent.detail?.email || "";
      setIsOpen(true);
      setStatus("idle");
      setEmail(incomingEmail);
      setName("");
      setYoutubeChannel("");
      setChannelData(null);
      setInterests([]);
      setObsSetup("using_obs");
      setSarvamPreference("need_key");
      setReason("");

      setTimeout(() => {
        if (!incomingEmail) {
          emailInputRef.current?.focus();
        } else {
          nameInputRef.current?.focus();
        }
      }, 100);
    };

    window.addEventListener("open-waitlist", handleOpen);
    return () => window.removeEventListener("open-waitlist", handleOpen);
  }, []);

  // YouTube Channel live lookup debounce
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    try {
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
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="waitlist-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Container */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl liquid-glass border border-white/15 p-6 sm:p-8 rounded-3xl overflow-hidden text-white shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer z-10"
              aria-label="Close waitlist modal"
            >
              <X size={20} />
            </button>

            {status === "success" ? (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex flex-col items-center text-center py-8 space-y-4"
              >
                <div className="w-16 h-16 bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle size={32} weight="fill" />
                </div>
                <h2 className="text-3xl font-bold font-sans tracking-tight">
                  Application Received!
                </h2>
                <p className="text-neutral-300 text-sm leading-relaxed max-w-md">
                  Thank you for applying, <strong className="text-white">{name || email}</strong>! We&apos;ve reserved your priority spot. Keep an eye on{" "}
                  <strong className="text-white">{email}</strong> — we&apos;ll send your access invitation as soon as a cohort slot opens.
                </p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full mt-4 px-6 py-3.5 text-xs font-bold text-black bg-white rounded-full hover:bg-neutral-200 active:scale-95 transition-all duration-200 cursor-pointer shadow-md"
                >
                  Back to Vaani
                </button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col space-y-5">
                <div>
                  <div className="inline-block px-3 py-1 rounded-full border border-white/15 bg-white/5 text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-300 mb-2.5">
                    Creator Beta Application
                  </div>
                  <h2
                    id="waitlist-title"
                    className="text-2xl sm:text-3xl font-sans font-bold text-white tracking-tight leading-tight"
                  >
                    Apply for <span className="font-serif italic font-normal">Vaani Beta</span>
                  </h2>
                  <p className="text-neutral-400 text-xs sm:text-sm mt-1 leading-relaxed">
                    Translate your broadcast live voice-to-voice across 8+ Indian languages.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Name & Email Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="modal-name" className="text-xs font-sans font-semibold text-neutral-300 pl-1">
                        First Name
                      </label>
                      <input
                        ref={nameInputRef}
                        type="text"
                        id="modal-name"
                        autoComplete="given-name"
                        placeholder="e.g. Aarav Mehta"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={status === "loading"}
                        className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-white/40 transition-colors placeholder:text-neutral-500 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="modal-email" className="text-xs font-sans font-semibold text-neutral-300 pl-1">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        ref={emailInputRef}
                        type="email"
                        id="modal-email"
                        required
                        autoComplete="email"
                        placeholder="creator@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={status === "loading"}
                        className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-white/40 transition-colors placeholder:text-neutral-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* YouTube Channel Input + Live Lookup */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="modal-yt" className="text-xs font-sans font-semibold text-neutral-300 pl-1 flex items-center justify-between">
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
                      id="modal-yt"
                      placeholder="e.g. youtube.com/@aaravplays or @aaravplays"
                      value={youtubeChannel}
                      onChange={(e) => setYoutubeChannel(e.target.value)}
                      disabled={status === "loading"}
                      className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-white/40 transition-colors placeholder:text-neutral-500 disabled:opacity-50"
                    />

                    {/* Detected YouTube Channel Card */}
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

                  {/* Languages Group */}
                  <div className="flex flex-col gap-1.5 pt-1">
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
                    <label htmlFor="modal-reason" className="text-xs font-sans font-semibold text-neutral-300 pl-1">
                      Why do you want to use Vaani? <span className="text-neutral-500 font-normal">(Use-case & Audience)</span>
                    </label>
                    <textarea
                      id="modal-reason"
                      rows={2}
                      placeholder="e.g. I stream gaming in Hindi but have viewers from South India. Multilingual audio channels let me keep one stream instead of three."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={status === "loading"}
                      className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-white/40 transition-colors placeholder:text-neutral-500 disabled:opacity-50 resize-none"
                    />
                  </div>

                  {/* Status Messages */}
                  <AnimatePresence mode="popLayout">
                    {status === "error" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-start gap-2 text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-xs font-sans"
                      >
                        <WarningCircle size={15} weight="bold" className="shrink-0 mt-0.5" />
                        <p>Something went wrong. Please check your connection and try again.</p>
                      </motion.div>
                    )}
                    {status === "duplicate" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-start gap-2 text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-xs font-sans"
                      >
                        <WarningCircle size={15} weight="bold" className="shrink-0 mt-0.5" />
                        <p>This email is already on the waitlist. We will notify you when a slot opens!</p>
                      </motion.div>
                    )}
                    {status === "review" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-start gap-2 text-blue-300 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-xs font-sans"
                      >
                        <WarningCircle size={15} weight="bold" className="shrink-0 mt-0.5" />
                        <p>Application submitted. Pending review — we will email you soon!</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={status === "loading" || !email}
                    className="mt-1 w-full flex items-center justify-center px-6 py-3.5 text-xs sm:text-sm font-bold bg-white text-black rounded-full hover:bg-neutral-200 disabled:opacity-50 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg"
                  >
                    {status === "loading" ? <CircleNotch className="animate-spin" size={18} /> : "Submit Application →"}
                  </button>
                </form>

                <p className="text-[11px] font-sans text-center text-neutral-500 px-4">
                  By applying, you agree to our{" "}
                  <Link href="/terms" className="underline underline-offset-2 text-neutral-400 hover:text-white transition-colors">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline underline-offset-2 text-neutral-400 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


