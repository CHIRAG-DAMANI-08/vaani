"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, CircleNotch, ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function BetaPendingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    document.body.classList.add("landing-dark-body");
    return () => {
      document.body.classList.remove("landing-dark-body");
    };
  }, []);

  const checkStatus = useCallback(async (isManual = false) => {
    try {
      if (isManual) setChecking(true);
      const res = await fetch("/api/beta/status");
      if (res.ok) {
        const data = await res.json();
        if (data.approved) {
          setIsApproved(true);
          toast.success("Your beta access has been approved! Redirecting...");
          router.replace("/dashboard");
          return;
        }
      }
      if (isManual) {
        toast.info("Your application is currently pending review. We will notify you by email once approved.");
      }
    } catch {
      if (isManual) {
        toast.error("Failed to check status. Please try again.");
      }
    } finally {
      if (isManual) setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    // Initial check
    checkStatus(false);

    // Poll every 5 seconds in case admin approves while user is waiting
    const interval = setInterval(() => {
      checkStatus(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [checkStatus]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <svg className="w-8 h-8 text-white" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <path d="M10 16c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-serif text-xl font-medium text-white">Vaani</span>
        </a>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
          <Clock size={40} />
        </div>
        <h1 className="text-3xl font-normal mb-3 text-white" style={{ fontFamily: "var(--font-playfair)" }}>
          Beta Access Pending
        </h1>
        <p className="text-white/70 leading-relaxed mb-4">
          You&apos;re signed in, but your beta application hasn&apos;t been approved yet.
        </p>
        <p className="text-white/50 text-sm mb-8">
          We review applications manually. You&apos;ll receive an email as soon as your access is approved.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => checkStatus(true)}
            disabled={checking || isApproved}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium text-black bg-white rounded-full hover:bg-neutral-200 active:scale-95 transition-all duration-200 w-full cursor-pointer disabled:opacity-50 shadow-lg"
          >
            {checking ? (
              <>
                <CircleNotch className="w-4 h-4 animate-spin" /> Checking Status...
              </>
            ) : isApproved ? (
              <>
                Access Approved! Entering Dashboard <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              "Check Application Status"
            )}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-medium text-white/70 hover:text-white transition-colors w-full"
          >
            Back to Home
          </Link>
        </div>
      </motion.div>

      <footer className="w-full border-t border-white/10 bg-white/[0.02] py-8 px-4 mt-auto">
        <div className="max-w-7xl mx-auto text-center text-xs text-white/40">
          © {new Date().getFullYear()} Vaani. Real-time multilingual streaming.
        </div>
      </footer>
    </main>
  );
}