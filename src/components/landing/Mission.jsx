import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const MISSION_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_132944_a0d124bb-eaa1-4082-aa30-2310efb42b4b.mp4";

const P1 =
  "We're building a space where your voice meets the world — where streamers reach further, viewers feel closer, and every broadcast becomes a conversation without borders.";
const P1_HIGHLIGHT = ["voice", "meets", "world"];

const P2 =
  "A platform where audio, translation, and reach flow together — with less latency, less friction, and more meaning for everyone watching.";

const Word = ({ children, progress, range, highlighted }) => {
  const opacity = useTransform(progress, range, [0.15, 1]);
  return (
    <span className="relative mr-[0.25em] inline-block">
      <motion.span
        style={{
          opacity,
          color: highlighted
            ? "hsl(var(--foreground))"
            : "hsl(var(--hero-subtitle))",
        }}
      >
        {children}
      </motion.span>
    </span>
  );
};

const RevealParagraph = ({ text, progress, range, className, highlight = [] }) => {
  const words = text.split(" ");
  const [start, end] = range;
  const span = end - start;
  return (
    <p className={className}>
      {words.map((word, i) => {
        const wStart = start + (i / words.length) * span;
        const wEnd = wStart + (1 / words.length) * span;
        const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
        return (
          <Word
            key={i}
            progress={progress}
            range={[wStart, wEnd]}
            highlighted={highlight.includes(clean)}
          >
            {word}
          </Word>
        );
      })}
    </p>
  );
};

export const Mission = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.4"],
  });

  return (
    <section
      id="philosophy"
      className="relative px-6 md:px-28 pt-0 pb-32 md:pb-44"
      data-testid="mission-section"
    >
      <div className="max-w-5xl mx-auto flex flex-col items-center">
        <div className="w-full max-w-[800px] aspect-square mb-16 md:mb-24">
          <video
            className="w-full h-full object-cover"
            src={MISSION_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            data-testid="mission-video"
          />
        </div>

        <div className="flex items-center gap-4 self-start mb-10">
          <span className="text-xs tracking-[3px] uppercase text-muted-foreground">
            01
          </span>
          <span className="h-px w-16 bg-border" />
          <span className="text-xs tracking-[3px] uppercase text-muted-foreground">
            Manifesto
          </span>
        </div>

        <div ref={ref} className="w-full">
          <RevealParagraph
            text={P1}
            progress={scrollYProgress}
            range={[0, 0.7]}
            highlight={P1_HIGHLIGHT}
            className="text-2xl md:text-4xl lg:text-5xl font-medium tracking-[-1px] leading-[1.15] flex flex-wrap"
          />
          <RevealParagraph
            text={P2}
            progress={scrollYProgress}
            range={[0.55, 1]}
            className="text-xl md:text-2xl lg:text-3xl font-medium mt-10 leading-[1.25] flex flex-wrap"
          />
        </div>
      </div>
    </section>
  );
};
