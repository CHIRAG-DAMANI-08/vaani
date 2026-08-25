"use client";

import { useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const missionText = {
  paragraphs: [
    {
      words: [
        "Vaani", "is", "more", "than", "translation.", "It's", "about", "bridging", "communities,",
        "breaking", "barriers,", "and", "amplifying", "voices", "that", "deserve", "to", "be", "heard."
      ],
    },
    {
      words: [
        "We", "believe", "language", "should", "connect,", "not", "divide.", "For", "millions", "of",
        "Indians", "streaming", "from", "anywhere,", "every", "language", "is", "a", "home."
      ],
    },
  ],
};

export const MissionSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const scrollProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full flex items-center justify-center px-6 overflow-hidden"
    >
      {/* Background - Gradient fallback since video may not be available */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.3))",
          zIndex: 1,
        }}
      >
        {/* Optional: subtle particles */}
        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-white/10 rounded-full animate-pulse" />
        <div className="absolute top-3/4 right-1/4 w-4 h-4 bg-white/10 rounded-full animate-pulse delay-1000" />
      </div>

      {/* Scroll Progress Indicator */}
      <div className="absolute top-8 left-8 w-12 h-12 rounded-full liquid-glass flex items-center justify-center z-10">
        <div className="w-6 h-6 rounded-full bg-white/30">
          <div
            className="w-full h-full rounded-full bg-white transition-transform duration-100"
            style={{ transform: `scaleY(${scrollProgress.get()})`, transformOrigin: "top" }}
          />
        </div>
      </div>

      {/* Mission Text */}
      <div className="relative z-10 max-w-3xl text-center px-4" style={{ fontFamily: "var(--font-serif)" }}>
        {missionText.paragraphs.map((paragraph, pIndex) => (
          <div key={pIndex} className="mb-12">
            <p className="text-white text-xl md:text-2xl leading-relaxed">
              {paragraph.words.map((word, wIndex) => {
                const progress = scrollProgress.get();
                const wordProgress = Math.min(Math.max(0, progress - wIndex * 0.02), 1);

                return (
                  <span
                    key={wIndex}
                    className="inline-block mr-2 transition-all duration-300"
                    style={{
                      opacity: wordProgress,
                      transform: `translateY(${10 * (1 - wordProgress)})`,
                      color: wordProgress > 0.5 ? "hsl(var(--accent))" : "hsl(var(--foreground))",
                    }}
                  >
                    {word}
                  </span>
                );
              })}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};