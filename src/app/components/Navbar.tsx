"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Menu, X, Instagram, Linkedin, Twitter } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Philosophy", href: "#philosophy" },
  { label: "Use Cases", href: "#use-cases" },
];

const socialLinks = [
  { icon: Instagram, href: "#" },
  { icon: Linkedin, href: "#" },
  { icon: Twitter, href: "#" },
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
      className="fixed top-0 left-0 w-full z-50 bg-transparent"
    >
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo - Concentric Circles */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-7 h-7">
              <div className="absolute inset-0 rounded-full border-2 border-white/60" />
              <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 border border-white/60 rounded-full" />
            </div>
            <span
              className="text-xl font-bold tracking-tight text-white"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              vaani
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors duration-200"
                >
                  {link.label} <span className="mx-1">•</span>
                </Link>
              ))}
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center hover:scale-105 transition-transform duration-200"
                >
                  <social.icon size={18} className="text-white/70" />
                </a>
              ))}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-full text-white hover:bg-white/10 transition-colors"
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
              className="md:hidden overflow-hidden mt-4"
            >
              <div className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors duration-200"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex gap-2 pt-2">
                  {socialLinks.map((social, i) => (
                    <a
                      key={i}
                      href={social.href}
                      className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center hover:scale-105 transition-transform duration-200"
                    >
                      <social.icon size={18} className="text-white/70" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};