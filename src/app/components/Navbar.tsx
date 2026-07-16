"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X, Globe, ExternalLink, MessageCircle } from "lucide-react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pipeline", href: "#pipeline" },
  { label: "Use Cases", href: "#use-cases" },
];

const socials = [
  { Icon: Globe, label: "global" },
  { Icon: ExternalLink, label: "docs" },
  { Icon: MessageCircle, label: "discord" },
];

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-50 px-8 md:px-28 py-4 transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-b border-gray-200" : "bg-white/80 backdrop-blur-md border-b border-gray-200"
      }`}
      data-testid="navbar"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link
            href="#home"
            className="flex items-center gap-2.5"
            data-testid="navbar-logo"
          >
            <span className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair)" }}>
              vaani
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2 text-sm">
            {navLinks.map((link, i) => (
              <div key={link.label} className="flex items-center gap-2">
                <Link
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-300"
                  data-testid={`nav-link-${i}`}
                >
                  {link.label}
                </Link>
                {i < navLinks.length - 1 && (
                  <span className="text-muted-foreground/40">•</span>
                )}
              </div>
            ))}
          </div>

          <Show when="signed-out">
            <button
              onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("open-waitlist")); }}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#F5821F] rounded-full hover:bg-[#E8690A] active:scale-95 transition-all duration-200 shadow-sm"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Join the waitlist
            </button>
          </Show>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3">
            {socials.map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                data-testid={`social-${label}`}
                className="w-10 h-10 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors duration-300"
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </a>
            ))}
          </div>

          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#F5821F] rounded-full hover:bg-[#E8690A] active:scale-95 transition-all duration-200 shadow-sm"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Dashboard
            </Link>
            <UserButton />
          </Show>

          <button
            className="lg:hidden p-2 rounded-full text-gray-800 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden transition-all duration-300 ${mobileOpen ? "max-h-96 pb-4" : "max-h-0 overflow-hidden"}`}>
        <div className="flex flex-col gap-2 mt-3">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-4 py-3 text-sm font-medium tracking-wide uppercase text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Show when="signed-out">
            <button
              onClick={(e) => { e.preventDefault(); setMobileOpen(false); window.dispatchEvent(new Event("open-waitlist")); }}
              className="px-5 py-3 text-sm font-medium text-white bg-[#F5821F] rounded-full hover:bg-[#E8690A] text-center shadow-sm"
            >
              Join the waitlist
            </button>
          </Show>
        </div>
      </div>
    </motion.nav>
  );
};