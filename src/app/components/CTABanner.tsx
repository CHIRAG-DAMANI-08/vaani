"use client";

import { motion } from "framer-motion";
import { ctaContent } from "./landing-content";

export const CTABanner = () => {
  return (
    <section className="py-20 md:py-32 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-[40px] overflow-hidden px-8 py-20 md:py-28"
          style={{
            background:
              "linear-gradient(135deg, rgba(200,210,240,0.3) 0%, rgba(230,220,240,0.2) 30%, rgba(244,162,97,0.15) 60%, rgba(200,210,240,0.2) 100%)",
          }}
        >
          {/* Subtle decorative gradient orbs */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, rgba(244,162,97,0.3) 0%, transparent 60%)",
            }}
          />

          <h2
            className="relative z-10 text-3xl md:text-5xl lg:text-6xl font-normal leading-tight mb-8"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {ctaContent.heading}
          </h2>

          <button
            onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("open-waitlist")); }}
            className="relative z-10 inline-flex items-center px-8 py-4 text-base font-medium text-white bg-[#131313] rounded-full hover:bg-[#2a2a2a] active:scale-95 transition-all duration-200 shadow-[0_4px_24px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {ctaContent.buttonText}
          </button>
        </motion.div>
      </div>
    </section>
  );
};