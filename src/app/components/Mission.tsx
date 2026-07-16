"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const MISSION_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_132944_a0d124bb-eaa1-4082-aa30-2310efb42b4b.mp4";

const P1 =
  "We're building a space where your voice meets the world — where streamers reach further, viewers feel closer, and every broadcast becomes a conversation without borders.";
const P1_HIGHLIGHT = ["voice", "meets", "world"];

const P2 =
  "A platform where audio, translation, and reach flow together — with less latency, less friction, and more meaning for everyone watching.";

const Word = ({
  children,
  progress,
  range,
  highlighted,
}: {
  children: React.ReactNode;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  range: [number, number];
  highlighted: boolean;
}) => {
  const opacity = useTransform(progress, range, [0.15, 1]);
  return (
    <span className="relative mr-[0.25em] inline-block">
      <motion.span
        style={{
          opacity,
          color: highlighted
            ? "var(--landing-fg)"
            : "var(--landing-hero-subtitle)",
        }}
      >
        {children}
      </motion.span>
    </span>
  );
};

const RevealParagraph = ({
  text,
  progress,
  range,
  className,
  highlight = [],
}: {
  text: string;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  range: [number, number];
  className?: string;
  highlight?: string[];
}) => {
  const words = text.split(" ");
  const [start, end] = range;
  const span = end - start;
  return (
    <p className={className}>
      {words.map((word, i) => {
        const wStart = start + (i / words.length) * span;
        const wEnd = wStart + (1 / words.length) * span * 1.5;
        return (
          <Word
            key={i}
            progress={progress}
            range={[wStart, Math.min(wEnd, 1)]}
            highlighted={highlight.some((h) =>
              word.toLowerCase().includes(h.toLowerCase())
            )}
          >
            {word}
          </Word>
        );
      })}
    </p>
  );
};

export const Mission = () => {
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "end 0.3"],
  });

  const videoScale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);
  const videoOpacity = useTransform(scrollYProgress, [0, 0.3], [0, 0.25]);

  return (
    <section
      ref={ref}
      className="relative min-h-[120vh] py-40 md:py-56 px-6 md:px-28 overflow-hidden"
      data-testid="mission-section"
    >
      {/* Background video */}
      <motion.div
        style={{ scale: videoScale, opacity: videoOpacity }}
        className="absolute inset-0 z-0"
      >
        <video
          className="w-full h-full object-cover"
          src={MISSION_VIDEO}
          autoPlay
          loop
          muted
          playsInline
        />
      </motion.div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <RevealParagraph
          text={P1}
          progress={scrollYProgress}
          range={[0, 0.5]}
          highlight={P1_HIGHLIGHT}
          className="text-3xl md:text-5xl lg:text-6xl font-medium tracking-[-1.5px] leading-[1.15]"
        />

        <RevealParagraph
          text={P2}
          progress={scrollYProgress}
          range={[0.5, 1]}
          className="mt-12 text-xl md:text-2xl font-normal tracking-[-0.5px] leading-[1.4]"
        />
      </div>
    </section>
  );
};
