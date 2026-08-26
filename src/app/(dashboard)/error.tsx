"use client";

import { useEffect } from "react";
import { Warning, ArrowCounterClockwise } from "@phosphor-icons/react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="liquid-glass p-10 max-w-md space-y-6 border border-white/10">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-[20px] bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Warning className="w-8 h-8 text-red-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
          <p className="text-sm text-neutral-400">
            We hit an unexpected error. Your data is safe — try refreshing.
          </p>
        </div>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-full text-sm font-semibold bg-white text-black hover:bg-neutral-200 transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowCounterClockwise className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
