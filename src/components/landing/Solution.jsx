import { motion } from "framer-motion";
import { fadeUp } from "../../lib/motion";

const SOLUTION_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_125119_8e5ae31c-0021-4396-bc08-f7aebeb877a2.mp4";

const features = [
  {
    title: "Real-Time STT",
    icon: "/icons/stt.svg",
    desc: "Saarika captures your speech the moment you say it, with 3-second chunking for near-instant relay.",
  },
  {
    title: "Live Translation",
    icon: "/icons/translate.svg",
    desc: "Meaning-aware translation keeps tone and intent intact across every target language.",
  },
  {
    title: "Natural TTS",
    icon: "/icons/tts.svg",
    desc: "Bulbul renders a lifelike voice so your audience hears you, not a robotic stand-in.",
  },
  {
    title: "Multi-Channel RTMP",
    icon: "/icons/stream.svg",
    desc: "Push one OBS source to multiple localized channels simultaneously — fully encrypted.",
  },
];

export const Solution = () => {
  return (
    <section
      id="pipeline"
      className="relative px-6 md:px-28 py-32 md:py-44 border-t border-border/30"
      data-testid="solution-section"
    >
      <div className="max-w-6xl mx-auto">
        <motion.span
          {...fadeUp(0)}
          className="block text-xs tracking-[3px] uppercase text-muted-foreground mb-6"
        >
          Solution
        </motion.span>

        <motion.h2
          {...fadeUp(0.08)}
          className="text-4xl md:text-6xl font-medium tracking-[-1px] max-w-3xl leading-[1.05] mb-16"
        >
          The platform for{" "}
          <span className="font-serif italic font-normal">borderless</span>{" "}
          streaming
        </motion.h2>

        <motion.div {...fadeUp(0.12)} className="mb-20">
          <video
            className="w-full rounded-2xl aspect-[3/1] object-cover"
            src={SOLUTION_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            data-testid="solution-video"
          />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp(0.15 + i * 0.1)}
              data-testid={`feature-${i}`}
            >
              <div className="h-px w-full bg-border/60 mb-5" />
              <img src={f.icon} alt="" className="w-6 h-6 mb-3" />
              <h3 className="font-semibold text-base mb-3">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
