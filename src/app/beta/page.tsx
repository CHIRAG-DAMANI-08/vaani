"use client";

import { useEffect } from "react";
import { BetaApplicationForm } from "@/app/components/BetaApplicationForm";

export default function BetaPage() {
  useEffect(() => {
    document.body.classList.add("landing-dark-body");
    return () => {
      document.body.classList.remove("landing-dark-body");
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      {/* Navbar - reuse landing navbar */}
      <header className="w-full border-b border-white/10 bg-white/[0.02] backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2" aria-label="Vaani Home">
            <svg className="w-8 h-8 text-white" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
              <path d="M10 16c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-serif text-xl font-medium text-white">Vaani</span>
          </a>
        </div>
      </header>

      {/* Hero + Form */}
      <section className="flex-1 flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-3xl">
          {/* Headline */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-[-2px] leading-[0.95] text-white" style={{ fontFamily: "var(--font-playfair)" }}>
              Apply for <span className="font-serif italic">Beta Access</span>
            </h1>
            <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
              Join streamers translating live to 4+ Indian languages. Limited seats — we review every application.
            </p>
          </div>

          {/* Form Card */}
          <div className="liquid-glass p-6 sm:p-8 md:p-10">
            <BetaApplicationForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-white/[0.02] py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-xs text-white/40">
          © {new Date().getFullYear()} Vaani. Real-time multilingual streaming.
        </div>
      </footer>
    </main>
  );
}