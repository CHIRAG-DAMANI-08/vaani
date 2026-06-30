"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const sections = [
  {
    title: "1. Stream normally on OBS",
    description:
      "Nothing changes for your English channel. Just start your stream as you normally would, using your existing setup.",
    tags: ["OBS", "Streaming", "Zero Changes"],
    gradientTop: "#f97316",
    gradientBottom: "#c4b5fd",
    diamonds: 1,
  },
  {
    title: "2. Vaani Listens & Translates",
    description:
      "Vaani listens in real time, translates your speech, and generates natural-sounding voice in each regional language.",
    tags: ["Translation", "TTS", "Real-Time"],
    gradientTop: "#f97316",
    gradientBottom: "#bbc5e4",
    diamonds: 2,
  },
  {
    title: "3. Auto-Live on YouTube",
    description:
      "Separate YouTube channels go live automatically for each language, reaching millions of new viewers instantly.",
    tags: ["YouTube", "Multilingual", "Live"],
    gradientTop: "#f97316",
    gradientBottom: "#a3c4a8",
    diamonds: 3,
  },
];

export const PlatformStack = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    mass: 0.1,
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Individual section opacities for text fades
  const text0Opacity = useTransform(smoothProgress, [0, 0.05, 0.3, 0.4], [0, 1, 1, 0]);
  const text1Opacity = useTransform(smoothProgress, [0.3, 0.4, 0.6, 0.7], [0, 1, 1, 0]);
  const text2Opacity = useTransform(smoothProgress, [0.6, 0.7, 0.95, 1], [0, 1, 1, 1]);

  // Diamond Y offsets (slide up into position)
  // Layer 1 enters softly
  const diamond1Y = useTransform(smoothProgress, [0, 0.05], [100, 0]);
  
  // Layer 2 rises CONTINUOUSLY over the entire first 40% of scroll
  const diamond2Y = useTransform(smoothProgress, [0.05, 0.4], [600, 0]);
  
  // Layer 3 rises CONTINUOUSLY over the next chunk of scroll
  const diamond3Y = useTransform(smoothProgress, [0.4, 0.7], [600, 0]);

  // We set opacity statically to 1 except for layer 1 entering
  const diamond1Opacity = useTransform(smoothProgress, [0, 0.1], [0, 1]);

  // Card gradient morph
  const gradBottom = useTransform(
    smoothProgress,
    [0, 0.33, 0.66, 1],
    ["#c4b5fd", "#bbc5e4", "#a3c4a8", "#a3c4a8"]
  );

  // Heading fade
  const headingOpacity = useTransform(smoothProgress, [0, 0.05], [0, 1]);

  const sharedGlassStyle = {
    borderRadius: 28,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.12) 100%)",
    backdropFilter: "blur(16px) saturate(1.4)",
    WebkitBackdropFilter: "blur(16px) saturate(1.4)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px rgba(0,0,0,0.06)",
    transform: "rotateX(55deg) rotateZ(-45deg)",
    transformStyle: "preserve-3d" as const,
  };

  return (
    <section id="platform" ref={containerRef} className="relative h-[400vh]">
      <div className="sticky top-0 min-h-[100dvh] md:h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-12 md:py-0">
        <div className="w-full max-w-6xl mx-auto px-6">
          {/* Top label */}
          <motion.p
            style={{ opacity: headingOpacity }}
            className="text-center text-[11px] font-medium tracking-[0.2em] uppercase text-muted mb-5"
          >
            For Creators &nbsp;|&nbsp; Streamers &nbsp;|&nbsp; Broadcasters
          </motion.p>

          {/* Section heading */}
          <motion.h2
            style={{ opacity: headingOpacity, fontFamily: "var(--font-playfair)" }}
            className="text-3xl md:text-5xl font-normal text-center mb-16"
          >
            How Vaani Works
          </motion.h2>

          <div className="flex flex-col md:flex-row gap-8 md:gap-12 lg:gap-24 items-center">
            {/* LEFT: Gradient card with stacked glass diamonds */}
            <div className="w-full md:w-[60%] flex justify-center">
              <motion.div
                className="relative w-[90%] md:w-full max-w-[700px] aspect-[16/11] md:aspect-[4/3] rounded-[32px] overflow-hidden shadow-sm"
                style={{
                  background: useTransform(
                    gradBottom,
                    (v) => `linear-gradient(180deg, #f97316 0%, ${v} 100%)`
                  ),
                }}
              >
                {/* Glass diamond shapes stacked in center */}
                <div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ perspective: "1200px" }}
                >
                  <div className="relative w-full h-full">
                    {/* Diamond 1 (top, always visible after scroll start) */}
                    <motion.div
                      style={{
                        opacity: diamond1Opacity,
                        y: diamond1Y,
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 3,
                      }}
                    >
                      <div className="w-[45vw] h-[45vw] md:w-[320px] md:h-[320px] -mt-[40px] md:-mt-[120px]" style={sharedGlassStyle} />
                    </motion.div>

                    {/* Diamond 2 (middle, pushes up underneath layer 1) */}
                    <motion.div
                      style={{
                        y: diamond2Y,
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2,
                      }}
                    >
                      <div
                        className="w-[45vw] h-[45vw] md:w-[320px] md:h-[320px]"
                        style={{
                          ...sharedGlassStyle,
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.08) 100%)",
                        }}
                      />
                    </motion.div>

                    {/* Diamond 3 (bottom, pushes up underneath layer 2) */}
                    <motion.div
                      style={{
                        y: diamond3Y,
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1,
                      }}
                    >
                      <div
                        className="w-[45vw] h-[45vw] md:w-[320px] md:h-[320px] mt-[40px] md:mt-[120px]"
                        style={{
                          ...sharedGlassStyle,
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
                        }}
                      />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* RIGHT: Text content that swaps with fade */}
            <div className="relative w-full md:w-[40%] min-h-[220px] md:min-h-[300px]">
              {sections.map((section, index) => {
                const opacityVal =
                  index === 0
                    ? text0Opacity
                    : index === 1
                      ? text1Opacity
                      : text2Opacity;

                return (
                  <motion.div
                    key={section.title}
                    style={{
                      opacity: opacityVal,
                      position: index === 0 ? "relative" : "absolute",
                      top: index === 0 ? undefined : 0,
                      left: index === 0 ? undefined : 0,
                      right: index === 0 ? undefined : 0,
                    }}
                  >
                    <h3
                      className="text-xl md:text-2xl font-bold mb-4"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      {section.title}
                    </h3>
                    <p className="text-muted text-sm md:text-base leading-relaxed mb-6 max-w-md">
                      {section.description}
                    </p>
                    {/* Tag pills */}
                    <div className="flex flex-wrap gap-2">
                      {section.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-4 py-1.5 text-sm text-foreground/70 bg-white shadow-sm border border-card-border rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
