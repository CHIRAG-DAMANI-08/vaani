"use client";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { logger } from "@/lib/logger";

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#3b3dbf] border-t-transparent" />
        <p className="text-sm text-black/50 font-medium">Completing sign in...</p>
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  );
}
