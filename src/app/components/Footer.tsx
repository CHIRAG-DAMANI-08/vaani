"use client";

import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-black py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Copyright */}
        <div className="text-center mb-8">
          <p className="text-white/60 text-sm">
            © {new Date().getFullYear()} Vaani. All rights reserved.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-12">
          <Link
            href="/privacy"
            className="text-white/60 hover:text-white transition-colors duration-200 text-sm"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-white/60 hover:text-white transition-colors duration-200 text-sm"
          >
            Terms of Service
          </Link>
          <Link
            href="/contact"
            className="text-white/60 hover:text-white transition-colors duration-200 text-sm"
          >
            Contact
          </Link>
        </div>

        {/* Made in India Badge */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-white/50 text-xs">
            Made in India · Powered by Indian AI
          </p>
        </div>
      </div>
    </footer>
  );
};