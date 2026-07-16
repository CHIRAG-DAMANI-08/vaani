"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";

/* Brand SVG icons — lucide-react no longer ships brand marks */
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
);
const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
);
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
);
import { Logo } from "./Logo";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pipeline", href: "#pipeline" },
  { label: "Use Cases", href: "#use-cases" },
];

const socials = [
  { Icon: InstagramIcon, label: "instagram", href: "#" },
  { Icon: LinkedinIcon, label: "linkedin", href: "#" },
  { Icon: TwitterIcon, label: "twitter", href: "#" },
];

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const authButtons = mounted ? (
    <>
      <Show when="signed-out">
        <button
          onClick={(e) => {
            e.preventDefault();
            window.dispatchEvent(new Event("open-waitlist"));
          }}
          className="px-5 py-2.5 text-sm font-medium text-[var(--landing-bg)] bg-[var(--landing-fg)] rounded-full hover:bg-white/90 active:scale-95 transition-all duration-200"
        >
          Join beta
        </button>
        <SignInButton>
          <button className="px-5 py-2.5 text-sm font-medium text-[var(--landing-fg)] border border-[var(--landing-fg)]/20 rounded-full hover:border-[var(--landing-fg)]/40 active:scale-95 transition-all duration-200">
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link
          href="/dashboard"
          className="px-5 py-2.5 text-sm font-medium text-[var(--landing-bg)] bg-[var(--landing-fg)] rounded-full hover:bg-white/90 active:scale-95 transition-all duration-200"
        >
          Dashboard
        </Link>
        <UserButton />
      </Show>
    </>
  ) : null;

  const mobileAuthButtons = mounted ? (
    <>
      <Show when="signed-out">
        <button
          onClick={(e) => {
            e.preventDefault();
            setMobileOpen(false);
            window.dispatchEvent(new Event("open-waitlist"));
          }}
          className="px-5 py-3 text-sm font-medium text-[var(--landing-bg)] bg-[var(--landing-fg)] rounded-full text-center"
        >
          Join beta
        </button>
        <SignInButton>
          <button className="px-5 py-3 text-sm font-medium text-[var(--landing-fg)] border border-[var(--landing-fg)]/20 rounded-full text-center">
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link
          href="/dashboard"
          className="px-5 py-3 text-sm font-medium text-[var(--landing-bg)] bg-[var(--landing-fg)] rounded-full text-center"
          onClick={() => setMobileOpen(false)}
        >
          Dashboard
        </Link>
      </Show>
    </>
  ) : null;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 md:px-28 py-4"
      data-testid="navbar"
    >
      <div className="flex items-center justify-between">
        {/* Left: Logo + Socials */}
        <div className="flex items-center gap-10">
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

          <div className="hidden md:flex items-center gap-4">
            {socials.map(({ Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="text-[var(--landing-fg)]/40 hover:text-[var(--landing-fg)] transition-colors duration-200"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Center: Nav Links (desktop) */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-4 py-2 text-sm text-[var(--landing-fg)]/50 hover:text-[var(--landing-fg)] transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right: Auth Buttons (desktop) */}
        <div className="hidden md:flex items-center gap-3">{authButtons}</div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 rounded-full text-[var(--landing-fg)] hover:bg-white/10 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
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
            className="md:hidden overflow-hidden mt-4 rounded-2xl bg-[var(--landing-bg)]/95 backdrop-blur-xl border border-[var(--landing-border)]"
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
                {mobileAuthButtons}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};