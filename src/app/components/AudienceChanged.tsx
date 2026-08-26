"use client";

import { motion } from "framer-motion";
import { Globe, Waveform, Television } from "@phosphor-icons/react";
import { fadeUp } from "@/lib/motion";

const cards = [
  {
    Icon: Globe,
    title: "Global viewers",
    desc: "Your audience no longer speaks one language. They arrive from every corner, expecting to understand you instantly.",
  },
  {
    Icon: Waveform,
    title: "Native audio",
    desc: "Subtitles are not enough. Viewers stay when they hear a natural voice speaking directly to them.",
  },
  {
    Icon: Television,
    title: "YouTube reach",
    desc: "Broadcast one source to localized channels and let the algorithm surface you to audiences you never had.",
  },
];

export const AudienceChanged = () => {
  return (
    <section
      id="how-it-works"
      className="relative px-6 md:px-28 pt-52 md:pt-64 pb-6 md:pb-9"
      data-testid="audience-section"
    >
      <div className="max-w-6xl mx-auto text-center">
        <motion.h2
          {...fadeUp(0)}
          className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-[-2px] leading-[0.95]"
        >
          The way people watch has{" "}
          <span className="text-[var(--landing-fg)]/40">changed</span>
        </motion.h2>

        <motion.p
          {...fadeUp(0.15)}
          className="mt-6 text-base md:text-lg text-[var(--landing-muted)] max-w-2xl mx-auto leading-relaxed"
        >
          Live audiences are global, multilingual, and impatient. Old
          workflows can't keep up.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6 mt-20">
          {cards.map(({ Icon, title, desc }, i) => (
            <motion.div
              key={title}
              {...fadeUp(0.1 * i + 0.25)}
              className="text-left p-8 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-card)] hover:border-[var(--landing-fg)]/20 transition-colors duration-300"
            >
              <Icon className="w-6 h-6 mb-5 text-[var(--landing-fg)]/60" />
              <h3 className="text-lg font-medium mb-2">{title}</h3>
              <p className="text-sm text-[var(--landing-muted)] leading-relaxed">
                {desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
