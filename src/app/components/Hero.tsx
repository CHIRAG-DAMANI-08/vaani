"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { toast } from "sonner";
import { Show, UserButton, useClerk } from "@clerk/nextjs";
import { LogIn } from "lucide-react";

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

export const Hero = () => {
  const ref = useRef(null);
  const [email, setEmail] = useState("");
  const { openSignIn } = useClerk();

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

  const handleSignIn = () => {
    openSignIn({
      forceRedirectUrl: "/dashboard",
    });
  };

  return (
    <section
      ref={ref}
      id="home"
      className="relative min-h-screen w-full overflow-hidden"
      data-testid="hero-section"
    >
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

      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background to-transparent z-[1]" />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 flex flex-col items-center text-center px-6 pt-28 md:pt-32 pb-32 max-w-5xl mx-auto min-h-screen justify-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex items-center gap-3 mb-8"
          data-testid="hero-social-proof"
        >
          <div className="flex -space-x-2">
            {avatars.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="w-8 h-8 rounded-full border-2 border-background object-cover grayscale"
              />
            ))}
          </div>
          <span className="text-muted-foreground text-sm">
            7,000+ streamers already broadcasting
          </span>
        </motion.div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-[-2px] leading-[0.95]">
          <span className="line-mask">
            <motion.span
              className="block"
              variants={lineReveal}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
            >
              Stream in
            </motion.span>
          </span>
          <span className="line-mask">
            <motion.span
              className="block"
              variants={lineReveal}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
            >
              <span className="font-serif italic font-normal">every</span> language
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="text-lg mt-8 max-w-xl"
          style={{ color: "hsl(var(--hero-subtitle))" }}
          data-testid="hero-subtitle"
        >
          vaani translates your live broadcast in real time — voice to voice — so
          every viewer hears you in their own language.
        </motion.p>

        <motion.form
          onSubmit={handleSubscribe}
          noValidate
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.95 }}
          className="liquid-glass rounded-full p-2 max-w-lg w-full mt-10 flex items-center gap-2"
          data-testid="hero-subscribe-form"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 bg-transparent px-5 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
            data-testid="hero-email-input"
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="bg-foreground text-background rounded-full px-8 py-3 text-sm font-semibold tracking-wide whitespace-nowrap"
            data-testid="hero-subscribe-button"
          >
            JOIN BETA
          </motion.button>
        </motion.form>

        {/* Auth buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          className="flex items-center gap-3 mt-6"
        >
          <Show when="signed-out">
            <motion.button
              onClick={handleSignIn}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#F5821F] rounded-full hover:bg-[#E8690A] active:scale-95 transition-all duration-200 shadow-sm"
              data-testid="hero-signin-button"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </motion.button>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </motion.div>
      </motion.div>
    </section>
  );
};