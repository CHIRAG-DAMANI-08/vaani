"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-16">
      {/* Aurora Background Gradient */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Orange warm glow at top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(244,162,97,0.5) 0%, rgba(244,162,97,0.2) 30%, rgba(168,184,216,0.15) 60%, transparent 80%)",
          }}
        />
        {/* Blue side glow */}
        <div
          className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(168,184,216,0.4) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-20 left-0 w-[500px] h-[500px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(200,184,232,0.3) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Decorative Motif */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 mb-6"
      >
        <svg
          width="120"
          height="48"
          viewBox="0 0 120 48"
          fill="none"
          className="text-foreground/20"
        >
          <path
            d="M60 4C55 4 48 12 40 16C32 20 24 18 20 22C16 26 20 32 28 32C36 32 40 28 48 24C56 20 60 28 60 28C60 28 64 20 72 24C80 28 84 32 92 32C100 32 104 26 100 22C96 18 88 20 80 16C72 12 65 4 60 4Z"
            fill="currentColor"
            opacity="0.3"
          />
          <circle cx="40" cy="20" r="3" fill="currentColor" opacity="0.2" />
          <circle cx="80" cy="20" r="3" fill="currentColor" opacity="0.2" />
          <circle cx="60" cy="12" r="2" fill="currentColor" opacity="0.15" />
        </svg>
      </motion.div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative z-10 mb-8"
      >
        <span className="inline-flex items-center px-5 py-2 text-sm font-medium text-foreground/70 bg-white/60 backdrop-blur-sm border border-white/40 rounded-full">
          Stream once. Reach everyone.
        </span>
      </motion.div>

      {/* Main Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="relative z-10 text-5xl md:text-7xl lg:text-8xl font-normal text-center leading-[1.1] tracking-tight mb-6 font-serif"
      >
        Vaani
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="relative z-10 text-base md:text-lg text-muted text-center max-w-xl leading-relaxed mb-10"
      >
        Vaani lets live streamers broadcast in Hindi, Tamil, Telugu, and Marathi simultaneously — in real time — from a single OBS setup.
      </motion.p>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="relative z-10"
      >
        <button
          onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("open-waitlist")); }}
          className="inline-flex items-center px-8 py-4 text-base font-medium text-white bg-foreground rounded-full hover:bg-[#2a2a2a] active:scale-95 transition-all duration-200 cta-shadow font-serif"
        >
          Join the waitlist
        </button>
      </motion.div>
    </section>
  );
};
