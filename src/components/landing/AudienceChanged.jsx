import { motion } from "framer-motion";
import { Globe, Waveform, YoutubeLogo } from "@phosphor-icons/react";
import { fadeUp } from "../../lib/motion";

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
    Icon: YoutubeLogo,
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
          <span className="font-serif italic font-normal">changed.</span> Have
          you?
        </motion.h2>

        <motion.p
          {...fadeUp(0.1)}
          className="text-muted-foreground text-lg max-w-2xl mx-auto mt-8 mb-24"
        >
          Attention is global and multilingual. vaani meets your viewers where
          they are — in their own words, in real time.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-12 md:gap-8 mb-20">
          {cards.map(({ Icon, title, desc }, i) => (
            <div
              key={title}
              className="flex flex-col items-center"
              data-testid={`audience-card-${i}`}
            >
              <motion.div
                {...fadeUp(0.15 + i * 0.12)}
                className="liquid-glass w-[200px] h-[200px] rounded-3xl flex items-center justify-center mb-8"
              >
                <Icon
                  className="w-16 h-16 text-foreground/90"
                  strokeWidth={1}
                />
              </motion.div>
              <motion.h3
                {...fadeUp(0.2 + i * 0.12)}
                className="font-semibold text-base mb-3"
              >
                {title}
              </motion.h3>
              <motion.p
                {...fadeUp(0.25 + i * 0.12)}
                className="text-muted-foreground text-sm max-w-xs leading-relaxed"
              >
                {desc}
              </motion.p>
            </div>
          ))}
        </div>

        <motion.p
          {...fadeUp(0.2)}
          className="text-muted-foreground text-sm text-center"
        >
          If you don&apos;t speak their language, someone else will.
        </motion.p>
      </div>
    </section>
  );
};
