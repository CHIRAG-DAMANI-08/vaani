"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { List, X } from "@phosphor-icons/react";
import { Logo } from "./Logo";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pipeline", href: "#pipeline" },
  { label: "Use Cases", href: "#use-cases" },
];

const MotionLink = motion(Link);

const authButtonBase =
  "inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm transition-all duration-200";
const primaryAuthButton = `${authButtonBase} bg-foreground text-background font-semibold`;
const secondaryAuthButton = `${authButtonBase} liquid-glass text-foreground`;

export const Navbar = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const signedOutAuthButtons = (
    <>
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
        <MotionLink
          href="/sign-in"
          data-testid="navbar-signin"
          className={secondaryAuthButton}
          onClick={() => setMobileOpen(false)}
        >
          Sign in
        </MotionLink>
      </motion.div>
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
        <MotionLink
          href="/sign-up"
          data-testid="navbar-signup"
          className={primaryAuthButton}
          onClick={() => setMobileOpen(false)}
        >
          Sign up
        </MotionLink>
      </motion.div>
    </>
  );

  const signedInAuthButtons = (
    <>
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
        <MotionLink
          href="/dashboard"
          data-testid="navbar-dashboard"
          className={primaryAuthButton}
          onClick={() => setMobileOpen(false)}
        >
          Dashboard
        </MotionLink>
      </motion.div>
      <UserButton />
    </>
  );

  if (!isLoaded) {
    return (
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 lg:px-24 py-4 bg-[var(--landing-bg)]/80 backdrop-blur-md border-b border-[var(--landing-border)]"
        data-testid="navbar"
      >
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          <a
            href="#home"
            className="flex items-center gap-2.5"
            data-testid="logo-link"
          >
            <Logo />
            <span className="text-lg font-semibold tracking-tight text-[var(--landing-fg)]">
              vaani
            </span>
          </a>
        </div>
      </motion.nav>
    );
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 lg:px-24 py-4 bg-[var(--landing-bg)]/80 backdrop-blur-md border-b border-[var(--landing-border)]"
      data-testid="navbar"
    >
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        {/* Left: Logo */}
        <div className="flex items-center gap-8 shrink-0">
          <a
            href="#home"
            className="flex items-center gap-2.5"
            data-testid="logo-link"
          >
            <Logo />
            <span className="text-lg font-semibold tracking-tight text-[var(--landing-fg)]">
              vaani
            </span>
          </a>
        </div>

        {/* Center: Nav Links (desktop) */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-[var(--landing-fg)]/50 hover:text-[var(--landing-fg)] transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right: Auth Buttons (desktop) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {!isSignedIn ? signedOutAuthButtons : signedInAuthButtons}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden p-2 rounded-full text-[var(--landing-fg)] hover:bg-white/10 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <List size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence mode="wait">
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden overflow-hidden mt-4 rounded-2xl bg-[var(--landing-bg)]/95 backdrop-blur-xl border border-[var(--landing-border)]"
          >
            <div className="px-6 py-5 flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-4 py-3 text-sm text-[var(--landing-fg)]/60 hover:text-[var(--landing-fg)] rounded-xl transition-all"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 mt-3">
                {!isSignedIn ? (
                  <div className="flex flex-col gap-2">{signedOutAuthButtons}</div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    {signedInAuthButtons}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};