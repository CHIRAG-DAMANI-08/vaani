"use client";

import { useState, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { joinBeta } from "@/app/actions/join-beta";
import { InterestPillGroup } from "./InterestPillGroup";

export function BetaApplicationForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "review" | "duplicate" | "error">("idle");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [deviceId] = useState(() => crypto.randomUUID().slice(0, 8));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    const formData = new FormData();
    formData.append("email", email);
    if (name) formData.append("name", name);
    if (interests.length) formData.append("interests", interests.join(","));
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
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      <div className="space-y-2">
        <label htmlFor="name" className="text-xs font-sans font-semibold text-foreground/70 pl-1">
          First name <span className="text-muted/60 font-normal">(Optional)</span>
        </label>
        <input
          type="text"
          id="name"
          autoComplete="given-name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={status === "loading"}
          className="w-full px-5 py-3.5 rounded-full bg-white/10 border border-white/20 text-sm text-foreground focus:outline-none focus:border-white/40 transition-colors placeholder:text-foreground/40 disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-xs font-sans font-semibold text-foreground/70 pl-1">
          Email address <span className="text-red-500">*</span>
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
          className="w-full px-5 py-3.5 rounded-full bg-white/10 border border-white/20 text-sm text-foreground focus:outline-none focus:border-white/40 transition-colors placeholder:text-foreground/40 disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-sans font-semibold text-foreground/70 pl-1">
          Languages you stream to <span className="text-muted/60 font-normal">(Select all that apply)</span>
        </label>
        <InterestPillGroup selected={interests} onChange={setInterests} />
      </div>

      <AnimatePresence mode="popLayout">
        {status === "error" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-sans text-red-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>Something went wrong. Please check your connection and try again.</p>
          </motion.div>
        )}
        {status === "duplicate" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-sans text-amber-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>You've already applied. We'll notify you when it's your turn!</p>
          </motion.div>
        )}
        {status === "review" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-sans text-amber-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>Application submitted. Pending review — we'll email you soon.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={status === "loading" || !email}
        className="w-full flex items-center justify-center px-6 py-4 text-base font-medium bg-foreground text-background rounded-full hover:opacity-90 disabled:opacity-60 active:scale-[0.98] disabled:active:scale-100 transition-all duration-200"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {status === "loading" ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          "Apply for Beta Access"
        )}
      </button>

      <p className="text-[11px] text-center text-muted/80 px-4">
        By applying, you agree to our Terms of Service and Privacy Policy. We won't spam you.
      </p>
    </form>
  );
}