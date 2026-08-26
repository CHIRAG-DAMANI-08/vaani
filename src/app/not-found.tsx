"use client";

import Link from "next/link";
import { PeaceHand3D } from "@/app/components/PeaceHand3D";
import { Clayboan404SVG } from "@/app/components/Clayboan404SVG";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col justify-between selection:bg-white selection:text-black relative overflow-hidden font-sans select-none">
      {/* Minimalist Top Header using Vaani Design System Typography (DM Sans / Syne) */}
      <header className="w-full z-30 px-6 sm:px-12 md:px-16 py-7 sm:py-9 flex items-center justify-between font-[family-name:var(--font-dm-sans)] text-[12px] sm:text-[13px] uppercase tracking-[0.22em] text-white/80">
        <Link
          href="/"
          className="font-[family-name:var(--font-syne)] font-bold text-white tracking-widest hover:text-white transition-opacity"
        >
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

      {/* Main Center Area: Exact Clayboan 404 with 3D Peace Hand front and center */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
        <div className="relative w-full max-w-[840px] md:max-w-[940px] flex items-center justify-center">
          
          {/* 3D Peace Hand Canvas front & center (scaled up and slowly transitioning) */}
          <div className="relative z-10 flex items-center justify-center">
            <PeaceHand3D />
          </div>

          {/* Exact Stylized 404 SVG overlaying front-and-center across the hand */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 px-2 sm:px-6">
            <Clayboan404SVG className="text-white drop-shadow-[0_20px_50px_rgba(0,0,0,0.95)]" />
          </div>
        </div>
      </main>

      {/* Bottom Center Minimal Link using Design System DM Sans: ◆ SEE SELECTED WORK */}
      <footer className="w-full z-30 py-8 sm:py-10 flex items-center justify-center text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-[family-name:var(--font-dm-sans)] text-[12px] sm:text-[13px] uppercase tracking-[0.25em] font-medium text-white/80 hover:text-white transition-all hover:tracking-[0.3em] active:scale-[0.98]"
        >
          <span className="text-[9px]">◆</span> SEE SELECTED WORK
        </Link>
      </footer>
    </div>
  );
}




