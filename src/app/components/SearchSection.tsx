"use client";

import { motion } from "framer-motion";

const platforms = [
  {
    title: "Sarvam AI",
    description: "State-of-the-art STT, translation, and TTS models for Indian languages",
    icon: (
      <svg viewBox="0 0 24 24" className="w-10 h-10 text-white/70">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
  },
  {
    title: "FFmpeg",
    description: "Real-time audio extraction and RTMP processing for seamless streaming",
    icon: (
      <svg viewBox="0 0 24 24" className="w-10 h-10 text-white/70">
        <path fill="currentColor" d="M8 5v14l11-7z" />
      </svg>
    ),
  },
  {
    title: "OBS",
    description: "Native integration for scene switching and stream control",
    icon: (
      <svg viewBox="0 0 24 24" className="w-10 h-10 text-white/70">
        <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
      </svg>
    ),
  },
];

export const SearchSection = () => {
  return (
    <section className="py-24 px-6" id="how-it-works">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: "var(--font-serif)" }}>
            Powered by <span className="text-white/70 italic">Sarvam AI, FFmpeg & OBS.</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Built on technologies that power the future of Indian streaming.
          </p>
        </motion.div>

        {/* Platform Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full liquid-glass flex items-center justify-center mx-auto mb-6">
                {platform.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{platform.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{platform.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Tagline Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <p className="text-white/50 text-sm">
            Connecting the dots between Indian languages and global platforms.
          </p>
        </motion.div>
      </div>
    </section>
  );
};