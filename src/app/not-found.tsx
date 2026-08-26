"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/app/components/Logo";
import { House, Compass } from "@phosphor-icons/react";
import { PeaceHand3D } from "@/app/components/PeaceHand3D";

export default function NotFound() {
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  return (
    <div
      className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col justify-between selection:bg-white selection:text-black relative overflow-hidden font-sans select-none"
      style={{ backgroundColor: "#000000", color: "#FFFFFF" }}
    >
      {/* Brutalist Grid Lines & Ambient Lighting */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#424242_1px,transparent_1px),linear-gradient(to_bottom,#424242_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />

      {/* Brutalist Header */}
      <header className="w-full z-20 px-6 sm:px-12 py-5 flex items-center justify-between border-b border-[#424242]/40 bg-black/60 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3 group">
          <Logo outer="w-7 h-7" inner="w-2.5 h-2.5" />
          <span className="text-sm font-mono uppercase tracking-[0.2em] font-semibold text-white group-hover:text-neutral-300 transition-colors">
            VAANI // 404
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#808080]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>STATUS: UNRESOLVED_ROUTE</span>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6 text-xs font-mono uppercase tracking-wider text-neutral-400">
          <Link
            href="/beta"
            className="hover:text-white transition-colors duration-150 py-1"
          >
            [ BETA ]
          </Link>
          <Link
            href="/contact"
            className="hover:text-white transition-colors duration-150 py-1"
          >
            [ CONTACT ]
          </Link>
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-none border border-white/20 bg-white/5 text-white hover:bg-white hover:text-black transition-all duration-150 font-semibold"
          >
            STUDIO →
          </Link>
        </nav>
      </header>

      {/* Center 3D Interactive Clay Hand Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 py-6">
        <div className="flex flex-col items-center justify-center">
          
          {/* Interactive 3D Peace Hand with Inverted Tracking */}
          <PeaceHand3D onCoordsChange={setCoords} />

          {/* Subtext and Brutalist Actions */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-2 sm:mt-4 text-center max-w-md mx-auto space-y-4"
          >
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-[#808080]">
              PEACE OUT · PAGE NOT FOUND
            </p>
            <p className="text-sm font-sans text-neutral-400 font-light leading-relaxed">
              The coordinates you followed do not exist on the broadcast grid. Return to the main pipeline.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-neutral-300 active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(255,255,255,0.15)] cursor-pointer"
              >
                <House className="w-4 h-4" weight="fill" />
                RETURN HOME
              </Link>
              <Link
                href="/beta"
                className="inline-flex items-center gap-2 px-5 py-3 border border-white/25 bg-transparent text-white font-mono text-xs uppercase tracking-widest hover:bg-white/10 hover:border-white transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                JOIN BETA
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Brutalist Footer with Coordinates */}
      <footer className="w-full z-20 px-6 sm:px-12 py-5 border-t border-[#424242]/40 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono tracking-widest text-[#808080] gap-3 bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <span>COORD_X: {coords.x}PX</span>
          <span>COORD_Y: {coords.y}PX</span>
        </div>

        <div className="text-neutral-400 uppercase tracking-widest hidden sm:block">
          VAANI REAL-TIME MULTILINGUAL BROADCASTING
        </div>

        <div>
          <span>© {new Date().getFullYear()} VAANI // ALL RIGHTS RESERVED</span>
        </div>
      </footer>
    </div>
  );
}


