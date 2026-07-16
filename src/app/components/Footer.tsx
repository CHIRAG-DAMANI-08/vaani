"use client";

import Link from "next/link";
import { footerSections } from "./landing-content";

export const Footer = () => {
  return (
    <footer className="border-t border-card-border bg-[#F2F2EE] py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Logo */}
        <div className="mb-12">
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            vaani
          </span>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-foreground/80 mb-4 uppercase tracking-wider">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted hover:text-foreground transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-6 border-t border-card-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} Vaani. All rights reserved.
          </p>
          <p className="text-xs text-muted">
            Made in India · Powered by Indian AI
          </p>
        </div>
      </div>
    </footer>
  );
};