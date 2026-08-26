"use client";

import Link from "next/link";
import { PeaceHand3D } from "@/app/components/PeaceHand3D";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col justify-between selection:bg-white selection:text-black relative overflow-hidden font-sans select-none">
      
      {/* 3D WebGL Layer (Fullscreen Canvas behind the 404 text) */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <PeaceHand3D />
      </div>

      {/* Top Header Navigation (using Vaani Design System DM Sans & Syne) */}
      <header className="w-full z-30 px-6 sm:px-12 md:px-16 py-6 sm:py-8 flex items-center justify-between font-[family-name:var(--font-dm-sans)] text-[12px] sm:text-[13px] uppercase tracking-[0.22em] text-[#808080] hover:text-white transition-colors">
        <Link
          href="/"
          className="group relative flex items-center gap-1.5 font-[family-name:var(--font-syne)] font-bold text-white tracking-widest"
        >
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

        <nav className="flex items-center gap-6 sm:gap-10 md:gap-14">
          <Link
            href="/dashboard"
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
            <span className="hidden sm:inline">SELECTED WORK</span>
          </Link>

          <Link
            href="/beta"
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
            <span>ABOUT</span>
          </Link>

          <Link
            href="/channels"
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
            <span>PIPELINE</span>
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

      {/* Main Center Area: Exact 404 Viewport Typography */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 pointer-events-none">
        <h1 className="text-[30.5vw] min-[601px]:text-[26.25vw] leading-none tracking-[-0.04em] font-normal text-white flex items-center justify-center select-none">
          <span
            className="italic font-serif font-light text-white"
            style={{ fontFamily: "'Playfair Display', 'Instrument Serif', Georgia, serif" }}
          >
            4
          </span>
          <span className="font-sans font-normal text-white">0</span>
          <span className="font-sans font-bold text-white">4</span>
        </h1>
      </main>

      {/* Bottom Action Button with Arrow & Diamond hover animation */}
      <footer className="w-full z-30 py-8 sm:py-12 flex items-center justify-center text-center">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 font-[family-name:var(--font-dm-sans)] text-[12px] sm:text-[13px] uppercase tracking-[0.24em] font-medium text-white hover:text-white transition-all active:scale-[0.98]"
        >
          {/* Animated Diamond Icon */}
          <div className="relative w-3.5 h-3.5 flex items-center justify-center overflow-hidden">
            <svg
              viewBox="0 0 11 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3 fill-current text-white transition-transform duration-300 ease-out group-hover:scale-125 group-hover:rotate-45"
            >
              <path d="M5.208 10.43L0 5.222L5.208 0L10.43 5.222L5.208 10.43Z" />
            </svg>
          </div>
          <span>SEE SELECTED WORK</span>
        </Link>
      </footer>
    </div>
  );
}





