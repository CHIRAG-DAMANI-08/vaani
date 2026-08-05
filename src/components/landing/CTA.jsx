import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Hls from "hls.js";
import { Logo } from "./Logo";
import { fadeUp } from "../../lib/motion";

const HLS_URL =
  "https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8";

export const CTA = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls;
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
      className="relative py-32 md:py-44 border-t border-border/30 overflow-hidden"
      data-testid="cta-section"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
        data-testid="cta-video"
      />
      <div className="absolute inset-0 bg-background/45 z-[1]" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl mx-auto">
        <motion.div {...fadeUp(0)} className="mb-8">
          <Logo outer="w-10 h-10" inner="w-5 h-5" />
        </motion.div>

        <motion.h2
          {...fadeUp(0.08)}
          className="text-5xl md:text-7xl font-medium tracking-[-2px] mb-6"
        >
          Start{" "}
          <span className="font-serif italic font-normal">broadcasting</span>
        </motion.h2>

        <motion.p
          {...fadeUp(0.15)}
          className="text-muted-foreground text-lg mb-10 max-w-lg"
        >
          Connect OBS, pick your languages, and go live to the world in minutes.
          No more limits on who can understand you.
        </motion.p>

        <motion.div
          {...fadeUp(0.22)}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="bg-foreground text-background rounded-lg px-8 py-3.5 text-sm font-semibold tracking-wide"
            data-testid="cta-subscribe-button"
          >
            Join the beta
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="liquid-glass rounded-lg px-8 py-3.5 text-sm font-semibold tracking-wide text-foreground"
            data-testid="cta-secondary-button"
          >
            See how it works
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};
