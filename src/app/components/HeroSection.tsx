"use client";

import { motion } from "framer-motion";
import { heroHeadings } from "./landing-content";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-16 px-6">
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

      {/* Main Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="relative z-10 text-5xl md:text-7xl lg:text-[5.5rem] font-normal text-center leading-[1.1] tracking-tight mb-6"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {heroHeadings.main.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < heroHeadings.main.split("\n").length - 1 && <br />}
          </span>
        ))}
        <span className="text-gradient font-semibold">Reach every audience.</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="relative z-10 text-base md:text-xl text-muted text-center max-w-2xl leading-relaxed"
      >
        {heroHeadings.subtitle}
      </motion.p>
    </section>
  );
};
