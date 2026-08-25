"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
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
            <Link
              href="/sign-in"
              data-testid="navbar-signin"
              className="px-6 py-2.5 text-sm font-semibold text-foreground bg-white/80 backdrop-blur-md border border-white/20 rounded-full hover:bg-white active:scale-[0.98] transition-all duration-200 liquid-glass"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              data-testid="navbar-signup"
              className="px-6 py-2.5 text-sm font-semibold text-background bg-foreground rounded-full hover:bg-opacity-90 active:scale-[0.98] transition-all duration-200"
              style={{ transformOrigin: "center" }}
            >
              Sign up
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              data-testid="navbar-dashboard"
              className="px-6 py-2.5 text-sm font-semibold text-background bg-foreground rounded-full hover:bg-opacity-90 active:scale-[0.98] transition-all duration-200"
              style={{ transformOrigin: "center" }}
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
                  <Link
                    href="/sign-in"
                    data-testid="navbar-signin"
                    className="px-6 py-3 text-sm font-semibold text-foreground bg-white/80 backdrop-blur-md border border-white/20 rounded-full text-center hover:bg-white transition-all duration-200 liquid-glass"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    data-testid="navbar-signup"
                    className="px-6 py-3 text-sm font-semibold text-background bg-foreground rounded-full text-center hover:bg-opacity-90 transition-all duration-200"
                    style={{ transformOrigin: "center" }}
                  >
                    Sign up
                  </Link>
                </Show>
                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    data-testid="navbar-dashboard"
                    className="px-6 py-3 text-sm font-semibold text-background bg-foreground rounded-full text-center hover:bg-opacity-90 transition-all duration-200"
                    style={{ transformOrigin: "center" }}
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