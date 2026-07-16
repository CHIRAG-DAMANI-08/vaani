"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Hls from "hls.js";
import { Logo } from "./Logo";
import { fadeUp } from "@/lib/motion";

const HLS_URL =
  "https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8";

export const CTABanner = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | undefined;
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(HLS_URL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = HLS_URL;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, []);

  return (
    <section
      id="use-cases"
      className="relative py-32 md:py-44 border-t border-[var(--landing-border)] overflow-hidden"
      data-testid="cta-section"
    >
      {/* Background HLS video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-[var(--landing-bg)]/70 z-[1]" />

      <div className="relative z-10 px-6 md:px-28">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeUp(0)} className="flex justify-center mb-8">
            <Logo outer="w-12 h-12" inner="w-5 h-5" />
          </motion.div>

          <motion.h2
            {...fadeUp(0.1)}
            className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-[-2px] leading-[0.95]"
          >
            Start broadcasting in{" "}
            <span className="text-[var(--landing-fg)]/40">every language</span>
          </motion.h2>

          <motion.p
            {...fadeUp(0.2)}
            className="mt-6 text-base md:text-lg text-[var(--landing-muted)] max-w-xl mx-auto leading-relaxed"
          >
            Join the beta and be one of the first creators to reach audiences
            beyond your native tongue.
          </motion.p>

          <motion.div
            {...fadeUp(0.3)}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
          >
            <button
              onClick={() =>
                window.dispatchEvent(new Event("open-waitlist"))
              }
              className="px-8 py-4 rounded-full bg-[var(--landing-fg)] text-[var(--landing-bg)] text-sm font-medium hover:bg-white/90 active:scale-95 transition-all duration-200"
            >
              Get early access
            </button>
            <a
              href="#pipeline"
              className="px-8 py-4 rounded-full border border-[var(--landing-fg)]/20 text-[var(--landing-fg)] text-sm font-medium hover:border-[var(--landing-fg)]/40 transition-colors duration-200"
            >
              Explore the pipeline
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
