"use client";

import { motion } from "framer-motion";

const demos = [
  {
    label: "Hindi Stream",
    gradient:
      "radial-gradient(circle, rgba(180,140,220,0.8) 0%, rgba(140,120,200,0.6) 40%, rgba(100,100,180,0.4) 70%, transparent 100%)",
    borderColor: "rgba(180,140,220,0.6)",
    btnBg: "bg-purple-200/60",
  },
  {
    label: "Tamil Stream",
    gradient:
      "radial-gradient(circle, rgba(244,162,97,0.8) 0%, rgba(230,140,60,0.6) 40%, rgba(200,120,40,0.4) 70%, transparent 100%)",
    borderColor: "rgba(244,162,97,0.6)",
    btnBg: "bg-orange-200/60",
  },
  {
    label: "Telugu Stream",
    gradient:
      "radial-gradient(circle, rgba(140,200,100,0.7) 0%, rgba(120,180,80,0.5) 40%, rgba(100,160,60,0.3) 70%, transparent 100%)",
    borderColor: "rgba(140,200,100,0.5)",
    btnBg: "bg-green-200/60",
  },
];

export const SamvaadDemo = () => {
  return (
    <section className="py-20 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-normal text-center mb-4"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          See it in action
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-muted text-lg mb-16 max-w-2xl mx-auto"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Indian creators stream in English and miss hundreds of millions of regional viewers. There&apos;s no real-time way to reach them — until now.
        </motion.p>

        <div className="rounded-[32px] bg-white/60 border border-card-border p-8 md:p-12">
          <div className="grid md:grid-cols-3 gap-8">
            {demos.map((demo, index) => (
              <motion.div
                key={demo.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="flex flex-col items-center"
              >
                {/* Lotus/Mandala Shape */}
                <div className="relative w-48 h-48 md:w-56 md:h-56 mb-6">
                  <svg
                    viewBox="0 0 200 200"
                    className="w-full h-full"
                    style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.08))" }}
                  >
                    {/* Outer petals */}
                    {Array.from({ length: 12 }).map((_, i) => (
                      <ellipse
                        key={i}
                        cx="100"
                        cy="100"
                        rx="25"
                        ry="55"
                        fill={`url(#grad-${index})`}
                        opacity="0.7"
                        transform={`rotate(${i * 30} 100 100)`}
                      />
                    ))}
                    {/* Inner circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r="35"
                      fill={`url(#grad-inner-${index})`}
                    />
                    <defs>
                      <radialGradient
                        id={`grad-${index}`}
                        cx="50%"
                        cy="50%"
                        r="50%"
                      >
                        <stop
                          offset="0%"
                          stopColor={
                            index === 0
                              ? "#c4a0e0"
                              : index === 1
                                ? "#f4a261"
                                : "#8cc840"
                          }
                          stopOpacity="0.8"
                        />
                        <stop
                          offset="100%"
                          stopColor={
                            index === 0
                              ? "#a080c0"
                              : index === 1
                                ? "#e08030"
                                : "#6ca020"
                          }
                          stopOpacity="0.3"
                        />
                      </radialGradient>
                      <radialGradient
                        id={`grad-inner-${index}`}
                        cx="50%"
                        cy="50%"
                        r="50%"
                      >
                        <stop
                          offset="0%"
                          stopColor={
                            index === 0
                              ? "#e0d0f0"
                              : index === 1
                                ? "#f8d0a0"
                                : "#c0e890"
                          }
                          stopOpacity="0.9"
                        />
                        <stop
                          offset="100%"
                          stopColor={
                            index === 0
                              ? "#c0a0e0"
                              : index === 1
                                ? "#f0b070"
                                : "#90c050"
                          }
                          stopOpacity="0.6"
                        />
                      </radialGradient>
                    </defs>
                  </svg>
                  {/* Start speaking button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      className={`px-5 py-2 text-sm font-medium rounded-full ${demo.btnBg} backdrop-blur-sm text-[#5A5854] hover:scale-105 transition-transform`}
                    >
                      Start broadcasting
                    </button>
                  </div>
                </div>
                <p
                  className="text-base font-medium text-[#1A1A1F]"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {demo.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

