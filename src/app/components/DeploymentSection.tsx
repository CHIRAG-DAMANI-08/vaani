"use client";

import { motion } from "framer-motion";

const deployments = [
  {
    imgSrc: "/built-for-01.png",
    title: "Free to start",
    description: "Just connect your Sarvam API key",
  },
  {
    imgSrc: "/built-for-02.png",
    title: "Pay Sarvam directly",
    description: "For AI compute (~₹12–18/hr per language)",
  },
  {
    imgSrc: "/built-for-03.png",
    title: "Vaani subscription",
    description: "Subscription pricing coming soon",
  },
];

export const DeploymentSection = () => {
  return (
    <section className="py-20 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-normal text-center mb-16 leading-tight"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Pricing
          <br />
          Simple and transparent
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-4">
          {deployments.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group rounded-3xl bg-white border border-card-border p-6 md:p-8 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
            >
              <div className="flex flex-col items-center text-center gap-6">
                <div
                  className="flex justify-center items-center w-[100px] h-[100px] overflow-hidden shrink-0 rounded-2xl"
                >
                  <img
                    src={item.imgSrc}
                    alt={item.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="w-full">
                  <h3
                    className="text-lg font-semibold mb-2 text-center whitespace-nowrap text-[#1A1A1F]"
                    style={{ fontFamily: "var(--font-syne)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#5A5854] leading-relaxed text-center whitespace-nowrap">
                    {item.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
