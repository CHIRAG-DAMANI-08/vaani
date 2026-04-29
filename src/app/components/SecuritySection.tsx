"use client";

import { motion } from "framer-motion";
const badges = [
  {
    imgSrc: "/iso.svg",
    label: "ISO:27001",
  },
  {
    imgSrc: "/aipaa.svg",
    label: "AICPA SOC 2",
  },
  {
    imgSrc: "/idr.svg",
    label: "India Data Residency",
  },
];

export const SecuritySection = () => {
  return (
    <section className="py-20 md:py-32 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-normal mb-16"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Creator-first reliability.
          <br />
          Built in from day one.
        </motion.h2>

        <div className="flex justify-center gap-6 md:gap-10">
          {badges.map((badge, index) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center"
            >
              <div
                className="flex justify-center items-center rounded-4xl md:rounded-full w-[140px] md:w-[200px] h-[140px] md:h-[200px] hover:scale-105 transition-transform duration-300"
                style={{ background: "#F0F3FA", boxShadow: "inset 0 0 50px #A5BBFC" }}
              >
                <img
                  src={badge.imgSrc}
                  alt={badge.label}
                  className="max-w-[60%] md:max-w-[65%] max-h-[60%] md:max-h-[65%] object-contain"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
