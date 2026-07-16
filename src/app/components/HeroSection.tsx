"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { toast } from "sonner";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_120549_0cd82c36-56b3-4dd9-b190-069cfc3a623f.mp4";

const avatars = [
  "https://i.pravatar.cc/80?img=12",
  "https://i.pravatar.cc/80?img=32",
  "https://i.pravatar.cc/80?img=54",
];

const lineReveal = {
  initial: { y: "110%" },
  animate: { y: "0%" },
};

export const HeroSection = () => {
  const ref = useRef<HTMLElement>(null);
  const [email, setEmail] = useState("");

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.18]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email to join the beta.");
      return;
    }
    toast.success("You're on the list. Welcome to vaani.");
    setEmail("");
  };

  return (
    <section
      ref={ref}
      id="home"
      className="relative min-h-screen w-full overflow-hidden"
      data-testid="hero-section"
    >
      {/* Parallax Video Background */}
      <motion.div
        style={{ y: videoY, scale: videoScale }}
        className="absolute inset-0 z-0"
      >
        <video
          className="w-full h-full object-cover"
          src={HERO_VIDEO}
          autoPlay
          loop
          muted
          playsInline
          data-testid="hero-video"
        />
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[var(--landing-bg)] to-transparent z-[1]" />

      {/* Content */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 flex flex-col items-center justify-end min-h-screen pb-20 md:pb-28 px-6 text-center"
      >
        {/* Headline */}
        <div className="overflow-hidden mb-4">
          <motion.h1
            variants={lineReveal}
            initial="initial"
            animate="animate"
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
            className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-[-2px] leading-[0.95] text-[var(--landing-fg)]"
          >
            Your voice.
          </motion.h1>
        </div>
        <div className="overflow-hidden mb-4">
          <motion.h1
            variants={lineReveal}
            initial="initial"
            animate="animate"
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.55 }}
            className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-[-2px] leading-[0.95] text-[var(--landing-fg)]"
          >
            Every language.
          </motion.h1>
        </div>
        <div className="overflow-hidden mb-8">
          <motion.h1
            variants={lineReveal}
            initial="initial"
            animate="animate"
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.7 }}
            className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-[-2px] leading-[0.95] text-[var(--landing-fg)]/60"
          >
            One stream.
          </motion.h1>
        </div>

        {/* Email form */}
        <motion.form
          onSubmit={handleSubscribe}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex w-full max-w-md gap-2"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email for early access"
            className="flex-1 px-5 py-3.5 rounded-full bg-white/10 border border-white/20 text-sm text-[var(--landing-fg)] placeholder:text-white/40 focus:outline-none focus:border-white/40 backdrop-blur-sm"
          />
          <button
            type="submit"
            className="px-6 py-3.5 rounded-full bg-[var(--landing-fg)] text-[var(--landing-bg)] text-sm font-medium hover:bg-white/90 active:scale-95 transition-all duration-200"
          >
            Join beta
          </button>
        </motion.form>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="flex items-center gap-3 mt-6"
        >
          <div className="flex -space-x-2">
            {avatars.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="w-8 h-8 rounded-full border-2 border-[var(--landing-bg)] object-cover"
              />
            ))}
          </div>
          <span className="text-xs text-white/50">2,400+ streamers on the waitlist</span>
        </motion.div>
      </motion.div>
    </section>
  );
};
