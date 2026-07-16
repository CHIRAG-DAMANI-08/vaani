"use client";

import { motion } from "framer-motion";
import { faqs } from "./landing-content";

export const TestimonialsSection = () => {
  return (
    <section className="py-20 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-normal text-center mb-16"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Frequently asked questions
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-[32px] bg-white border border-card-border p-8 md:p-12"
        >
          {/* FAQs List */}
          <div className="flex flex-col gap-8 mb-8">
            {faqs.map((faq, index) => (
              <div key={index}>
                <span
                  className="text-xl font-bold tracking-tight text-[#1A1A1F] mb-2 block"
                  style={{ fontFamily: "var(--font-syne)" }}
                >
                  {faq.q}
                </span>
                <p className="text-base md:text-lg leading-relaxed text-[#5A5854] max-w-4xl">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

        </motion.div>
      </div>
    </section>
  );
};