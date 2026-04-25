"use client";

import { Toaster } from "sonner";

/**
 * VaaniToaster — Client-side Sonner toast wrapper.
 * Uses glassmorphism-compatible styling with the Vaani design system.
 */
export function VaaniToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.9)",
          borderRadius: "20px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
          fontFamily: "var(--font-dm-sans)",
          fontSize: "13px",
        },
      }}
    />
  );
}
