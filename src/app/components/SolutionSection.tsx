"use client";

import { motion } from "framer-motion";

const features = [
  {
    title: "Real-time Translation",
    description: "Translate audio streams instantly with Sarvam AI's state-of-the-art models.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/70">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
  },
  {
    title: "Multi-language Output",
    description: "Simultaneously stream to Hindi, Tamil, Telugu, and Marathi RTMP endpoints.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/70">
        <path fill="currentColor" d="M8 5v14l11-7z" />
      </svg>
    ),
  },
  {
    title: "OBS Integration",
    description: "Control your streams directly from OBS with scene switching and status sync.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/70">
        <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
      </svg>
    ),
  },
  {
    title: "Live Dashboard",
    description: "Monitor translations, costs, and transcripts in real-time with our web dashboard.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/70">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      </svg>
    ),
  },
];

export const SolutionSection = () => {
  return (
    <section className="py-24 px-6" id="solution">
      <div className="max-w-6xl mx-auto">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 text-sm font-medium text-white/70 bg-white/5 border border-white/10 rounded-full">
            SOLUTION
          </span>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: "var(--font-serif)" }}>
            Meaningful <span className="text-white/70 italic">translation</span> for every stream
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            A complete pipeline for multilingual live streaming with Indian language support.
          </p>
        </motion.div>

        {/* Background Video - with gradient fallback */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="relative mb-16 rounded-3xl overflow-hidden"
        >
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            }}
          />
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-64 md:h-80 object-cover"
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              target.style.display = "none";
            }}
          >
            <source src="/solution-background.mp4" type="video/mp4" />
          </video>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full liquid-glass flex items-center justify-center mx-auto mb-5">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};