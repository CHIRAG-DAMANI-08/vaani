"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import {
  Menu,
  X,
} from "lucide-react";
import { navLinks } from "./landing-content";

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

  // Render a minimal shell on the server / before hydration to avoid mismatch
  const authButtons = mounted ? (
    <>
      <Show when="signed-out">
        <button
          onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("open-waitlist")); }}
          className="px-5 py-2.5 text-sm font-medium text-white bg-[#F5821F] rounded-full hover:bg-[#E8690A] active:scale-95 transition-all duration-200 shadow-sm"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Join the waitlist
        </button>
        <SignInButton>
          <button
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 active:scale-95 transition-all duration-200 shadow-sm"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Sign in
          </button>
        </SignInButton>
      </Show>
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
    </>
  ) : null;

  const mobileAuthButtons = mounted ? (
    <>
      <Show when="signed-out">
        <button
          onClick={(e) => { e.preventDefault(); setMobileOpen(false); window.dispatchEvent(new Event("open-waitlist")); }}
          className="px-5 py-3 text-sm font-medium text-white bg-[#F5821F] rounded-full hover:bg-[#E8690A] text-center shadow-sm"
        >
          Join the waitlist
        </button>
        <SignInButton>
          <button className="px-5 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full text-center hover:bg-gray-50 shadow-sm">
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link
          href="/dashboard"
          className="px-5 py-3 text-sm font-medium text-white bg-[#F5821F] rounded-full hover:bg-[#E8690A] text-center shadow-sm"
          onClick={() => setMobileOpen(false)}
        >
          Dashboard
        </Link>
      </Show>
    </>
  ) : null;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[1200px] transition duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-200"
          : "bg-white/80 backdrop-blur-md border border-gray-200"
      } ${mobileOpen ? "rounded-3xl" : "rounded-full"}`}
    >
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className="text-2xl font-bold tracking-tight text-gray-900"
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
              className="px-4 py-2 text-sm font-medium tracking-wide uppercase text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 rounded-full transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {authButtons}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 rounded-full text-gray-800 hover:bg-gray-100 transition-colors"
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
            className="md:hidden overflow-hidden"
          >
            <div className="px-6 pb-5 pt-2 flex flex-col gap-2">
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