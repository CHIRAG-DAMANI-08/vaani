"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/app/components/Logo";
import { ArrowLeft, House } from "@phosphor-icons/react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col justify-between selection:bg-white/20 selection:text-white relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full z-20 px-6 sm:px-12 py-6 sm:py-8 flex items-center justify-between border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3 group">
          <Logo outer="w-7 h-7" inner="w-2.5 h-2.5" />
          <span
            className="text-xl font-normal text-white tracking-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Vaani
          </span>
        </Link>

        <nav className="flex items-center gap-6 sm:gap-8 text-sm font-medium text-neutral-400">
          <Link
            href="/beta"
            className="hover:text-white transition-colors duration-200"
          >
            Beta
          </Link>
          <Link
            href="/contact"
            className="hover:text-white transition-colors duration-200"
          >
            Contact
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-full border border-white/15 bg-white/[0.04] text-white hover:bg-white/10 transition-all duration-200"
          >
            Dashboard
          </Link>
        </nav>
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto flex flex-col items-center"
        >
          {/* Small 404 indicator tag */}
          <span className="text-xs sm:text-sm font-mono tracking-[0.3em] uppercase text-neutral-400 mb-6 sm:mb-8 inline-block px-3.5 py-1 rounded-full border border-white/10 bg-white/[0.02]">
            404
          </span>

          {/* Super Keen 404 copy */}
          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-normal text-white leading-[1.18] tracking-tight mb-8 sm:mb-10 text-balance"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Page went out for snacks.<br className="hidden sm:inline" />
            {" "}We’re not mad. We just<br className="hidden sm:inline" />
            {" "}hope it brings back chips.
          </h1>

          {/* Back Home CTA Button */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-[0_4px_25px_rgba(255,255,255,0.15)] cursor-pointer"
            >
              <House className="w-4 h-4" weight="fill" />
              Back to Home
            </Link>
            <Link
              href="/beta"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/15 bg-white/[0.02] text-neutral-300 hover:text-white hover:bg-white/[0.06] text-sm font-medium transition-all cursor-pointer"
            >
              Join the Beta
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full z-20 px-6 sm:px-12 py-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400">
        <p>© {new Date().getFullYear()} Vaani. Real-time multilingual streaming.</p>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-neutral-300 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-neutral-300 transition-colors">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}

