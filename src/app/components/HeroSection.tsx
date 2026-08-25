"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

export const HeroSection = () => {
  const [avatarsLoaded, setAvatarsLoaded] = useState(true);

  // Fallback avatar component for when images fail to load
  const AvatarFallback = ({ size = 16 }: { size?: number }) => (
    <div
      className="rounded-full bg-white/20 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div className="w-1/2 h-1/3 bg-white/40 rounded-full" />
    </div>
  );

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background - Gradient fallback since video may not be available */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)",
        }}
      >
        {/* Optional: Add subtle animated particles */}
        <div className="absolute inset-0 opacity-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white blur-32" />
          <div className="absolute top-3/4 right-1/4 w-64 h-64 rounded-full bg-white blur-32" />
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-black to-transparent" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
        {/* Avatar Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-12"
        >
          <div className="flex items-end gap-4">
            {[1, 2, 3].map((num) => (
              <div key={num} className="relative">
                <img
                  src={`/avatar-${num}.png`}
                  alt={`Avatar ${num}`}
                  className="w-16 h-16 rounded-full border-2 border-white/30 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
                <AvatarFallback size={16} />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white/30" />
              </div>
            ))}
          </div>

          {/* Stats Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-4 text-center"
          >
            <div className="text-3xl font-bold text-white mb-1">
              <span className="text-green-400">100K+</span> translations
            </div>
            <div className="text-white/60 text-sm">
              Live multilingual streams across India
            </div>
          </motion.div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl md:text-6xl font-bold text-white text-center mb-6 leading-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Get Inspired with <span className="text-white/70 italic">Us</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-lg text-center mb-10 max-w-2xl"
          style={{ color: "hsl(var(--hero-subtitle))" }}
        >
          Real-time multilingual translation for live streamers. Reach Hindi, Tamil, Telugu & Marathi audiences instantly with our Sarvam AI-powered pipeline.
        </motion.p>

        {/* Email Form */}
        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-md"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 rounded-full liquid-glass text-white placeholder:text-white/50 focus:outline-none"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-full liquid-glass text-white font-medium hover:scale-105 transition-transform duration-200"
          >
            Subscribe
          </button>
        </motion.form>
      </div>
    </section>
  );
};