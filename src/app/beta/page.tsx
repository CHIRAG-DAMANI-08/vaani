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
          <a href="/" className="flex items-center gap-2.5" aria-label="Vaani Home">
            <span className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            </span>
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