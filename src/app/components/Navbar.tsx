"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "For creators", href: "#for-creators" },
];

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[1200px] rounded-full transition-all duration-300 ${
        scrolled
          ? "bg-card-bg/90 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-card-border"
          : "bg-card-bg/80 backdrop-blur-md border border-card-border"
      }`}
    >
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className="text-2xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            vaani
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-4 py-2 text-sm font-medium tracking-wide uppercase text-text-secondary hover:text-foreground hover:bg-black/5 rounded-full transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Show when="signed-out">
            <button
              onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("open-waitlist")); }}
              className="px-5 py-2.5 text-sm font-medium text-white bg-foreground rounded-full hover:bg-[#2a2a2a] active:scale-95 transition-all duration-200 cta-shadow font-serif"
            >
              Join the waitlist
            </button>
            <SignInButton>
              <button
                className="px-5 py-2.5 text-sm font-medium text-text-secondary bg-card-bg border border-card-border rounded-full hover:bg-black/5 active:scale-95 transition-all duration-200 shadow-sm font-sans"
              >
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 text-sm font-medium text-white bg-foreground rounded-full hover:bg-[#2a2a2a] active:scale-95 transition-all duration-200 cta-shadow font-serif"
            >
              Dashboard
            </Link>
            <UserButton />
          </Show>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 rounded-full text-foreground hover:bg-black/5 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden"
          >
            <div className="px-6 pb-5 pt-2 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="px-4 py-3 text-sm font-medium tracking-wide uppercase text-text-secondary hover:text-foreground hover:bg-black/5 rounded-xl transition-all"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-3">
                <Show when="signed-out">
                  <button
                    onClick={(e) => { e.preventDefault(); setMobileOpen(false); window.dispatchEvent(new Event("open-waitlist")); }}
                    className="px-5 py-3 text-sm font-medium text-white bg-foreground rounded-full hover:bg-[#2a2a2a] text-center cta-shadow font-serif"
                  >
                    Join the waitlist
                  </button>
                  <SignInButton>
                    <button className="px-5 py-3 text-sm font-medium text-text-secondary bg-card-bg border border-card-border rounded-full text-center hover:bg-black/5 shadow-sm font-sans">
                      Sign in
                    </button>
                  </SignInButton>
                </Show>
                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    className="px-5 py-3 text-sm font-medium text-white bg-foreground rounded-full hover:bg-[#2a2a2a] text-center cta-shadow font-serif"
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                </Show>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};