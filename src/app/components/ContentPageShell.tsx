"use client";

import { useEffect, type ReactNode } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

/**
 * Shared chrome for standalone content pages (privacy, terms, contact).
 * Mirrors the landing page: applies the dark landing theme to <body> and
 * composes the landing Navbar + Footer around readable content.
 */
export function ContentPageShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add("landing-dark-body");
    return () => document.body.classList.remove("landing-dark-body");
  }, []);

  return (
    <div
      className="grain relative min-h-screen bg-background text-foreground"
      data-testid="content-page"
    >
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 md:px-8 pt-32 pb-24">{children}</main>
      <Footer />
    </div>
  );
}
