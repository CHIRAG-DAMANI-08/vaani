"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Logo } from "./Logo";

const navLinks = ["Home", "How It Works", "Pipeline", "Use Cases"];

const MotionLink = motion(Link);

const authButtonBase =
  "inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm transition-all duration-200";
const primaryAuthButton = `${authButtonBase} bg-foreground text-background font-semibold`;
const secondaryAuthButton = `${authButtonBase} liquid-glass text-foreground`;

export const Navbar = () => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-8 md:px-28 py-4 pointer-events-none"
        data-testid="navbar"
      >
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="flex items-center justify-between pointer-events-auto"
        >
          <a href="#home" className="flex items-center gap-2.5" data-testid="navbar-logo">
            <Logo />
            <span className="font-bold text-foreground text-lg tracking-tight">vaani</span>
          </a>
        </motion.div>
      </nav>
    );
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 px-8 md:px-28 py-4 pointer-events-none"
      data-testid="navbar"
    >
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className="flex items-center justify-between pointer-events-auto"
      >
        <div className="flex items-center gap-10">
          <a
            href="#home"
            className="flex items-center gap-2.5"
            data-testid="navbar-logo"
          >
            <Logo />
            <span className="font-bold text-foreground text-lg tracking-tight">
              vaani
            </span>
          </a>

          <div className="hidden lg:flex items-center gap-2 text-sm">
            {navLinks.map((link, i) => (
              <div key={link} className="flex items-center gap-2">
                <a
                  href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-300"
                  data-testid={`nav-link-${i}`}
                >
                  {link}
                </a>
                {i < navLinks.length - 1 && (
                  <span className="text-muted-foreground/40">•</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {!isSignedIn ? (
            <>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <MotionLink
                  href="/sign-in"
                  data-testid="navbar-signin"
                  className={secondaryAuthButton}
                >
                  Sign in
                </MotionLink>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <MotionLink
                  href="/sign-up"
                  data-testid="navbar-signup"
                  className={primaryAuthButton}
                >
                  Sign up
                </MotionLink>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <MotionLink
                  href="/dashboard"
                  data-testid="navbar-dashboard"
                  className={primaryAuthButton}
                >
                  Dashboard
                </MotionLink>
              </motion.div>
              <UserButton />
            </>
          )}
        </div>
      </motion.div>
    </nav>
  );
};
