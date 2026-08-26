"use client";

import Link from "next/link";
import { Logo } from "@/app/components/Logo";
import { PeaceHand3D } from "@/app/components/PeaceHand3D";

export default function NotFound() {
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

      {/* Main Center Area: Exact 404 Viewport Typography in Light Grey (#A8A8A8) */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 pointer-events-none">
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

      {/* Minimal bottom spacer without the button */}
      <div className="h-10 sm:h-14 pointer-events-none" />
    </div>
  );
}
