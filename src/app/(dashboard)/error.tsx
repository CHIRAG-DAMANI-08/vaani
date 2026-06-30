"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

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
      <div className="glass-card p-10 max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-[20px] bg-[#F5821F]/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-[#F5821F]" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-500">
            We hit an unexpected error. Your data is safe — try refreshing.
          </p>
        </div>
        <button
          onClick={reset}
          className="btn-primary inline-flex items-center gap-2 text-sm cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
