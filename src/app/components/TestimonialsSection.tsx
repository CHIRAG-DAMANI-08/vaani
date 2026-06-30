"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const faqs = [
  {
    q: "Does this affect my main English stream?",
    a: "No. Your OBS setup and English channel are completely untouched."
  },
  {
    q: "Do I need separate YouTube channels?",
    a: "Yes — one per language. Vaani guides you through setting them up."
  },
  {
    q: "How much does it cost?",
    a: "You pay Sarvam AI directly at their standard rates (~₹12–18/hr per language). Vaani's own subscription pricing is coming soon."
  },
  {
    q: "Is there a delay on language channels?",
    a: "About 4–8 seconds. Invisible to viewers who only watch their language."
  },
  {
    q: "What if one channel crashes mid-stream?",
    a: "Other channels keep running. You get an alert on your dashboard."
  }
];

export const TestimonialsSection = () => {
  return (
    <section className="py-20 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-normal text-center mb-16 font-serif"
        >
          Frequently asked questions
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-[32px] bg-card-bg border border-card-border p-8 md:p-12"
        >
          {/* FAQs List */}
          <div className="flex flex-col gap-8 mb-8">
            {faqs.map((faq, index) => (
              <div key={index}>
                <span className="text-xl font-bold tracking-tight text-text-primary mb-2 block font-semibold">
                  {faq.q}
                </span>
                <p className="text-base md:text-lg leading-relaxed text-text-secondary max-w-4xl">
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