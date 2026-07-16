"use client";

import { motion } from "framer-motion";
import { marqueeItems } from "./landing-content";

export const LogoMarquee = () => {
  return (
    <section className="py-12 overflow-hidden">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center text-xs font-medium tracking-[0.2em] uppercase text-muted mb-10"
      >
        Unmatched reach and scale
      </motion.p>

      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#F5F5F0] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#F5F5F0] to-transparent z-10" />

        <div className="flex animate-marquee">
          {[...marqueeItems, ...marqueeItems].map((logo, i) => (
            <div
              key={`${logo}-${i}`}
              className="flex-shrink-0 mx-8 flex items-center justify-center h-12 min-w-[140px]"
            >
              <span className="text-lg font-semibold text-foreground/30 tracking-wide whitespace-nowrap select-none">
                {logo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};