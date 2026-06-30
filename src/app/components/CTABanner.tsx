"use client";

import { motion } from "framer-motion";
import Link from "next/link";

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
              "linear-gradient(135deg, rgba(var(--cloud-gradient),0.3) 0%, rgba(var(--aurora-lavender),0.2) 30%, rgba(var(--aurora-orange),0.15) 60%, rgba(var(--cloud-gradient),0.2) 100%)",
          }}
        >
          {/* Subtle decorative gradient orbs */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, rgba(var(--aurora-orange),0.3) 0%, transparent 60%)",
            }}
          />

          <h2 className="relative z-10 text-3xl md:text-5xl lg:text-6xl font-normal leading-tight mb-8 font-serif">
            Stream once. Reach everyone
            <br />
            with Vaani.
          </h2>

          <button
            onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("open-waitlist")); }}
            className="relative z-10 inline-flex items-center px-8 py-4 text-base font-medium text-white bg-foreground rounded-full hover:bg-[#2a2a2a] active:scale-95 transition-all duration-200 cta-shadow font-serif"
          >
            Join the waitlist
          </button>
        </motion.div>
      </div>
    </section>
  );
};
