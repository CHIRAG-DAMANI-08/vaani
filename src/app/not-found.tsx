"use client";

import Link from "next/link";
import { PeaceHand3D } from "@/app/components/PeaceHand3D";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col justify-between selection:bg-white selection:text-black relative overflow-hidden font-sans select-none">
      {/* Minimalist Top Header with 5 spaced items matching Clayboan */}
      <header className="w-full z-30 px-6 sm:px-12 md:px-16 py-7 sm:py-9 flex items-center justify-between text-[11px] sm:text-xs font-mono uppercase tracking-[0.2em] text-white/90">
        <Link href="/" className="font-bold hover:text-white transition-opacity">
          VAANI
        </Link>
        <Link href="/dashboard" className="hidden sm:inline-block hover:text-white transition-opacity">
          SELECTED WORK
        </Link>
        <Link href="/beta" className="hover:text-white transition-opacity">
          ABOUT
        </Link>
        <Link href="/channels" className="hidden sm:inline-block hover:text-white transition-opacity">
          PIPELINE
        </Link>
        <Link href="/contact" className="hover:text-white transition-opacity">
          LET&apos;S CHAT
        </Link>
      </header>

      {/* Main Center Area: Huge 404 with 3D Peace Hand front and center */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
        <div className="relative w-full max-w-[960px] flex items-center justify-center">
          
          {/* 3D Peace Hand Canvas scaling from 0 to full size */}
          <div className="relative z-10 flex items-center justify-center">
            <PeaceHand3D />
          </div>

          {/* Large Stylized 404 Graphic overlaying right over/across the hand */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <h1 className="text-[120px] sm:text-[180px] md:text-[240px] lg:text-[290px] font-serif font-black tracking-tighter leading-none text-[#FFFFFF] flex items-center justify-center drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
              <span className="italic font-serif mr-[-10px] sm:mr-[-20px] transform -translate-y-2">4</span>
              <span className="font-sans font-light tracking-tight text-white/95">0</span>
              <span className="font-sans font-extrabold tracking-normal ml-[-5px] sm:ml-[-10px]">4</span>
            </h1>
          </div>
        </div>
      </main>

      {/* Bottom Center Minimal Link: ◆ SEE SELECTED WORK */}
      <footer className="w-full z-30 py-8 sm:py-10 flex items-center justify-center text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-mono uppercase tracking-[0.25em] text-white/80 hover:text-white transition-all hover:tracking-[0.3em] active:scale-[0.98]"
        >
          <span className="text-[9px]">◆</span> SEE SELECTED WORK
        </Link>
      </footer>
    </div>
  );
}



