"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { joinWaitlist } from "@/app/actions/join-waitlist";

export const WaitlistModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");
  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setStatus("idle");
      setEmail("");
      setName("");
      // Add slight delay to allow modal to render before focusing
      setTimeout(() => emailInputRef.current?.focus(), 100);
    };
    window.addEventListener("open-waitlist", handleOpen);
    return () => window.removeEventListener("open-waitlist", handleOpen);
  }, []);

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
      
      const response = await joinWaitlist(null, formData);
      
      if (response.state === "duplicate") {
        setStatus("duplicate");
      } else if (response.state === "validation_error" || response.state === "server_error") {
        setStatus("error");
      } else if (response.state === "success") {
        setStatus("success");
      }
    } catch (error) {
      logger.error({ error }, "Waitlist submit failed");;
      setStatus("error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="waitlist-title">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Container */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.97, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 15 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md liquid-glass p-8 md:p-10 overflow-hidden text-foreground"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-2 text-foreground/50 hover:text-foreground hover:bg-white/10 rounded-full transition-colors"
              aria-label="Close waitlist"
            >
              <X size={20} />
            </button>

            {status === "success" ? (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center py-6"
              >
                <div className="w-16 h-16 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-normal mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
                  You&apos;re on the list!
                </h2>
                <p className="text-muted text-sm leading-relaxed mb-8">
                  Keep an eye on <strong>{email}</strong>. We&apos;ll send you an invite as soon as Vaani opens up for your language.
                </p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full px-6 py-3.5 text-sm font-medium text-foreground bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-all duration-200"
                >
                  Close window
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col"
              >
                <h2 id="waitlist-title" className="text-3xl font-normal mb-3 text-foreground" style={{ fontFamily: "var(--font-playfair)" }}>
                  Join the Waitlist
                </h2>
                <p className="text-muted text-sm leading-relaxed mb-8">
                  Get early access to our real-time multilingual streaming engine. We&apos;re prioritizing creators based on their signup date.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="email" className="text-xs font-semibold text-foreground/70 pl-2">
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
                      className="w-full px-5 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-sm text-foreground focus:outline-none focus:border-white/40 transition-colors placeholder:text-foreground/40 disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="name" className="text-xs font-semibold text-foreground/70 pl-2">
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
                      className="w-full px-5 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-sm text-foreground focus:outline-none focus:border-white/40 transition-colors placeholder:text-foreground/40 disabled:opacity-50"
                    />
                  </div>

                  {/* Status Messages */}
                  <AnimatePresence mode="popLayout">
                    {status === "error" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-xs">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <p>Something went wrong. Please check your connection and try again.</p>
                      </motion.div>
                    )}
                    {status === "duplicate" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-xs">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <p>This email is already on the waitlist. We&apos;ll notify you when it&apos;s your turn!</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={status === "loading" || !email}
                    className="mt-2 w-full flex items-center justify-center px-6 py-4 text-base font-medium bg-foreground text-background rounded-full hover:opacity-90 disabled:opacity-60 active:scale-[0.98] disabled:active:scale-100 transition-all duration-200"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {status === "loading" ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      "Join the waitlist"
                    )}
                  </button>
                </form>
                <p className="text-[11px] text-center text-muted/80 mt-6 px-4">
                  By joining, you agree to our{" "}
                  <Link href="/terms" className="underline underline-offset-2 text-foreground/80 hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline underline-offset-2 text-foreground/80 hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                  . We won&apos;t spam you.
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
