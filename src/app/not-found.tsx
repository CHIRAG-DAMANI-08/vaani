"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { ContentPageShell } from "@/app/components/ContentPageShell";

export default function NotFound() {
  return (
    <ContentPageShell>
      <motion.header
        {...fadeUp(0)}
        className="mx-auto max-w-2xl pt-16 md:pt-24"
      >
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          404
        </p>
        <h1 className="mb-6 font-serif text-4xl md:text-5xl text-foreground">
          Page not found
        </h1>
        <p className="max-w-xl leading-relaxed text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been
          moved.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-4 text-base font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Back to Home
          </Link>
        </div>
      </motion.header>
    </ContentPageShell>
  );
}
