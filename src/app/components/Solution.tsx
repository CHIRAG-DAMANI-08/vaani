"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

const SOLUTION_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_125119_8e5ae31c-0021-4396-bc08-f7aebeb877a2.mp4";

const features = [
  {
    title: "Real-Time STT",
    desc: "Saarika captures your speech the moment you say it, with 3-second chunking for near-instant relay.",
  },
  {
    title: "Live Translation",
    desc: "Meaning-aware translation keeps tone and intent intact across every target language.",
  },
  {
    title: "Natural TTS",
    desc: "Bulbul renders a lifelike voice so your audience hears you, not a robotic stand-in.",
  },
  {
    title: "Multi-Channel RTMP",
    desc: "Push one OBS source to multiple localized channels simultaneously — fully encrypted.",
  },
];

export const Solution = () => {
  return (
    <section
      id="pipeline"
      className="relative px-6 md:px-28 py-32 md:py-44 border-t border-[var(--landing-border)]"
      data-testid="solution-section"
    >
      <div className="max-w-6xl mx-auto">
        <motion.span
          {...fadeUp(0)}
          className="block text-xs tracking-[3px] uppercase text-[var(--landing-muted)] mb-4"
        >
          The Pipeline
        </motion.span>

        <motion.h2
          {...fadeUp(0.1)}
          className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-[-2px] leading-[0.95] max-w-3xl"
        >
          One click.{" "}
          <span className="text-[var(--landing-fg)]/40">Four stages.</span>{" "}
          Every language.
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-10 mt-20">
          {/* Video */}
          <motion.div
            {...fadeUp(0.2)}
            className="relative aspect-video rounded-2xl overflow-hidden border border-[var(--landing-border)]"
          >
            <video
              className="w-full h-full object-cover"
              src={SOLUTION_VIDEO}
              autoPlay
              loop
              muted
              playsInline
            />
          </motion.div>

          {/* Feature list */}
          <div className="flex flex-col justify-center gap-8">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                {...fadeUp(0.1 * i + 0.3)}
                className="border-l-2 border-[var(--landing-fg)]/15 pl-6 hover:border-[var(--landing-fg)]/40 transition-colors duration-300"
              >
                <h3 className="text-lg font-medium mb-1">{feat.title}</h3>
                <p className="text-sm text-[var(--landing-muted)] leading-relaxed">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
