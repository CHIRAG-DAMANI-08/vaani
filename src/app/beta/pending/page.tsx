"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Clock } from "@phosphor-icons/react";
import Link from "next/link";

export default function BetaPendingPage() {
  useEffect(() => {
    document.body.classList.add("landing-dark-body");
    return () => {
      document.body.classList.remove("landing-dark-body");
    };
  }, []);

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
        <div className="w-20 h-20 mx-auto mb-6 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center">
          <Clock size={40} />
        </div>
        <h1 className="text-3xl font-normal mb-3 text-white" style={{ fontFamily: "var(--font-playfair)" }}>
          Beta Access Pending
        </h1>
        <p className="text-white/70 leading-relaxed mb-6">
          You're signed in, but your beta application hasn't been approved yet.
        </p>
        <p className="text-white/50 text-sm mb-8">
          We review applications manually. You'll receive an email when your seat is ready.
        </p>
        <div className="space-y-3">
          <Link
            href="/beta"
            className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-medium text-foreground bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-all duration-200 w-full"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Check Application Status
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-medium text-white/70 hover:text-white transition-colors w-full"
            style={{ fontFamily: "var(--font-playfair)" }}
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