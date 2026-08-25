"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export const CTASection = () => {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const hlsInstanceRef = useRef<any>(null);
  const [hlsSupported, setHlsSupported] = useState(false);

  useEffect(() => {
    const initHLS = async () => {
      try {
        const HLS = (await import("hls.js")).default;
        setHlsSupported(HLS.isSupported());

        if (videoContainerRef.current && HLS.isSupported()) {
          const video = videoContainerRef.current.querySelector("video");
          if (video) {
            const hls = new HLS();
            hls.loadSource("/cta-video.m3u8");
            hls.attachMedia(video);
            hlsInstanceRef.current = hls;
          }
        }
      } catch (error) {
        console.warn("HLS.js not available, using fallback");
        setHlsSupported(false);
      }
    };

    initHLS();

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
      }
    };
  }, []);

  return (
    <section className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
      {/* Video Background */}
      <div ref={videoContainerRef} className="absolute inset-0">
        <video
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          style={{ filter: "brightness(0.5)" }}
        >
          <source src="/cta-video.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10" />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-20 flex flex-col items-center gap-8 px-6"
      >
        {/* Concentric Circles Logo */}
        <div className="w-16 h-16 rounded-full liquid-glass flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full border-2 border-white/60" />
            <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 border border-white/60 rounded-full" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center" style={{ fontFamily: "var(--font-serif)" }}>
          Ready to bring your voice to the world?
        </h2>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 rounded-full liquid-glass text-white font-medium text-lg"
          >
            Subscribe Now
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 rounded-full border border-white/20 text-white font-medium text-lg hover:bg-white/10 transition-colors duration-200"
          >
            Start Writing
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
};