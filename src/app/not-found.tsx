"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { Logo } from "@/app/components/Logo";
import { PeaceHand3D } from "@/app/components/PeaceHand3D";

export default function NotFound() {
  const [funFact, setFunFact] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/fun-fact")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.fact) {
          setFunFact(data.fact);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch fun fact:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col justify-between selection:bg-white selection:text-black relative overflow-hidden font-sans select-none">
      
      {/* 3D WebGL Layer (Fullscreen Canvas behind the 404 text) */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <PeaceHand3D />
      </div>

      {/* Top Header Navigation with Vaani Logo and Landing Page Section Anchors */}
      <header className="w-full z-30 px-6 sm:px-12 md:px-16 py-6 sm:py-8 flex items-center justify-between font-[family-name:var(--font-dm-sans)] text-[12px] sm:text-[13px] uppercase tracking-[0.22em] text-[#808080] hover:text-white transition-colors">
        
        {/* Brand Logo + Wordmark */}
        <Link
          href="/"
          className="group relative flex items-center gap-2.5 font-[family-name:var(--font-syne)] font-bold text-white tracking-widest"
        >
          <Logo outer="w-5 h-5" inner="w-2 h-2" />
          <span>VAANI</span>
          <svg
            viewBox="0 0 11 11"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-2 h-2 fill-current text-white transition-transform duration-300 ease-out scale-0 -rotate-180 group-hover:scale-100 group-hover:rotate-0"
          >
            <path d="M5.208 10.43L0 5.222L5.208 0L10.43 5.222L5.208 10.43Z" />
          </svg>
        </Link>

        {/* Section Navigation Links */}
        <nav className="flex items-center gap-6 sm:gap-10 md:gap-14">
          <Link
            href="/#how-it-works"
            className="group relative flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <svg
              viewBox="0 0 11 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-1.5 h-1.5 fill-current text-white transition-transform duration-300 ease-out scale-0 -rotate-180 group-hover:scale-100 group-hover:rotate-0 absolute -left-3"
            >
              <path d="M5.208 10.43L0 5.222L5.208 0L10.43 5.222L5.208 10.43Z" />
            </svg>
            <span className="hidden sm:inline">HOW IT WORKS</span>
          </Link>

          <Link
            href="/#pipeline"
            className="group relative flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <svg
              viewBox="0 0 11 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-1.5 h-1.5 fill-current text-white transition-transform duration-300 ease-out scale-0 -rotate-180 group-hover:scale-100 group-hover:rotate-0 absolute -left-3"
            >
              <path d="M5.208 10.43L0 5.222L5.208 0L10.43 5.222L5.208 10.43Z" />
            </svg>
            <span>PIPELINE</span>
          </Link>

          <Link
            href="/#use-cases"
            className="group relative flex items-center gap-1.5 hover:text-white transition-colors hidden sm:flex"
          >
            <svg
              viewBox="0 0 11 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-1.5 h-1.5 fill-current text-white transition-transform duration-300 ease-out scale-0 -rotate-180 group-hover:scale-100 group-hover:rotate-0 absolute -left-3"
            >
              <path d="M5.208 10.43L0 5.222L5.208 0L10.43 5.222L5.208 10.43Z" />
            </svg>
            <span>USE CASES</span>
          </Link>

          <Link
            href="/contact"
            className="group relative flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <svg
              viewBox="0 0 11 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-1.5 h-1.5 fill-current text-white transition-transform duration-300 ease-out scale-0 -rotate-180 group-hover:scale-100 group-hover:rotate-0 absolute -left-3"
            >
              <path d="M5.208 10.43L0 5.222L5.208 0L10.43 5.222L5.208 10.43Z" />
            </svg>
            <span>LET&apos;S CHAT</span>
          </Link>
        </nav>
      </header>

      {/* Main Center Area: 404 Heading */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 text-center pointer-events-none">
        <h1 className="text-[30.5vw] min-[601px]:text-[26.25vw] leading-none tracking-[-0.04em] font-normal text-[#A8A8A8] flex items-center justify-center select-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.9)]">
          <span
            className="italic font-serif font-light text-[#A8A8A8]"
            style={{ fontFamily: "'Playfair Display', 'Instrument Serif', Georgia, serif" }}
          >
            4
          </span>
          <span className="font-sans font-normal text-[#A8A8A8]">0</span>
          <span className="font-sans font-bold text-[#A8A8A8]">4</span>
        </h1>
      </main>

      {/* Bottom Information Section: Positioned clearly below the 3D hand */}
      <footer className="w-full z-30 pb-8 sm:pb-12 pt-2 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-xl flex flex-col items-center gap-2 pointer-events-auto">
          {funFact && (
            <div className="flex flex-col items-center gap-1 animate-in fade-in duration-700">
              <span className="font-[family-name:var(--font-syne)] text-[11px] sm:text-[12px] uppercase tracking-[0.25em] font-semibold text-white/90">
                Did you know?
              </span>
              <p className="font-[family-name:var(--font-dm-sans)] text-[12px] sm:text-[14px] text-white/75 tracking-wide leading-relaxed font-normal max-w-lg">
                &ldquo;{funFact}&rdquo;
              </p>
            </div>
          )}

          <p className="font-[family-name:var(--font-dm-sans)] text-[11px] sm:text-[13px] text-[#808080] tracking-[0.18em] uppercase font-medium mt-0.5">
            anyways, that page does not exist.
          </p>

          {/* Text-only CTA with Phosphor ArrowRight */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2 font-[family-name:var(--font-dm-sans)] text-[12px] sm:text-[13px] uppercase tracking-[0.22em] font-medium text-white/90 hover:text-white transition-all mt-2.5 hover:tracking-[0.26em] active:scale-[0.98]"
          >
            <span>Back to Home</span>
            <ArrowRight
              size={14}
              weight="bold"
              className="text-white transition-transform duration-300 ease-out group-hover:translate-x-1.5"
            />
          </Link>
        </div>
      </footer>
    </div>
  );
}
