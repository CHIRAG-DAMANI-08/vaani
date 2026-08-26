"use client";

import { useState, useEffect } from "react";
import { AudioMeter } from "./dashboard/AudioMeter";
import { PreflightModal } from "@/app/components/PreflightModal";
import { OnboardingWizard } from "@/app/components/OnboardingWizard";
import { PageTransition } from "@/app/components/PageTransition";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { motion, useReducedMotion } from "framer-motion";
import {
  SquaresFour,
  Broadcast,
  Gear,
  Shield,
  List,
  X,
  Lightning,
} from "@phosphor-icons/react";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: SquaresFour },
  { label: "Channels", href: "/channels", icon: Broadcast },
];

function StreamStatusPill({ status }: { status: "ready" | "live" | "error" }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium liquid-glass border border-white/10 text-white/80 shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(170,15%,45%)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2DD4BF]" />
        </span>
        Ready
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium liquid-glass border border-[#2DD4BF]/40 text-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.15)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2DD4BF] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2DD4BF]" />
        </span>
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium liquid-glass border border-red-500/30 text-red-400">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      Error
    </span>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const shouldReduceMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const streamStatus = isStreaming ? "live" : "ready";

  // Key and OBS status for Go Live button
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [hasOBS, setHasOBS] = useState<boolean | null>(null);
  const [showPreflight, setShowPreflight] = useState(false);

  useEffect(() => {
    async function fetchStatuses() {
      try {
        const [keyRes, obsRes] = await Promise.all([
          fetch("/api/key/status"),
          fetch("/api/obs/status"),
        ]);
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          setHasKey(keyData.connected);
        }
        if (obsRes.ok) {
          const obsData = await obsRes.json();
          setHasOBS(obsData.configured);
        }
      } catch {
        // Silently fail
      }
    }
    fetchStatuses();

    const unsubFns: Array<() => void> = [];

    import("@/lib/obs-relay-client").then((mod) => {
      mod.obsRelayManager.initRelay();

      unsubFns.push(
        mod.obsRelayManager.subscribeStreaming((streaming) => {
          setIsStreaming(streaming);
        })
      );

      unsubFns.push(
        mod.obsRelayManager.subscribeSnapshot((snapshot) => {
          setEstimatedCost(snapshot.stats?.estimatedCostINR ?? 0);
        })
      );

      unsubFns.push(
        mod.obsRelayManager.subscribeErrors((error) => {
          toast.error(error, {
            description: "Check your settings and try again.",
            duration: 5000,
          });
        })
      );
    });

    return () => {
      unsubFns.forEach((fn) => fn());
    };
  }, [pathname]);

  const pillTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 380, damping: 34 };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white font-sans selection:bg-white selection:text-black">
      <OnboardingWizard />
      {showPreflight && (
        <PreflightModal
          onClose={() => setShowPreflight(false)}
          onStart={() => {
            setShowPreflight(false);
          }}
        />
      )}

      {/* Main Layout Grid */}
      <div className="relative z-10 w-full h-full flex">
        {/* Desktop Left Fixed Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#0a0a0a] border-r border-white/10 h-full shrink-0 relative overflow-hidden">
          <div className="flex flex-col h-full p-5">
            {/* Record Icon Logo + vaani wordmark */}
            <div className="h-16 flex items-center px-2">
              <Link href="/" className="flex items-center gap-3 group">
                <span className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                </span>
                <span className="font-sans font-bold text-2xl tracking-tight text-white">
                  vaani
                </span>
              </Link>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 space-y-6 mt-6">
              <div>
                <p className="px-3 text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-3">
                  Menu
                </p>
                <div className="space-y-1.5">
                  {navItems.map((item) => {
                    const isActive = pathname?.startsWith(item.href) ?? false;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-300 ${
                          isActive
                            ? "text-white"
                            : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-active-pill"
                            transition={pillTransition}
                            className="absolute inset-0 rounded-2xl bg-white/[0.07] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_10px_-4px_rgba(0,0,0,0.6)] backdrop-blur-sm z-0"
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-3">
                          <item.icon
                            className={`w-4 h-4 transition-colors duration-300 ${
                              isActive ? "text-white" : "text-neutral-400"
                            }`}
                            strokeWidth={1.6}
                          />
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-1.5">
                <p className="px-3 text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-3">
                  Personal
                </p>
                {(() => {
                  const isSettingsActive =
                    pathname?.startsWith("/settings") ?? false;
                  return (
                    <Link
                      href="/settings"
                      className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-300 ${
                        isSettingsActive
                          ? "text-white"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {isSettingsActive && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          transition={pillTransition}
                          className="absolute inset-0 rounded-2xl bg-white/[0.07] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_10px_-4px_rgba(0,0,0,0.6)] backdrop-blur-sm z-0"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-3">
                        <Gear
                          className={`w-4 h-4 transition-colors duration-300 ${
                            isSettingsActive ? "text-white" : "text-neutral-400"
                          }`}
                          strokeWidth={1.6}
                        />
                        Settings
                      </span>
                    </Link>
                  );
                })()}

                {(() => {
                  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
                  const isUserAdmin =
                    userEmail === "damanichiru38@gmail.com" ||
                    (user?.emailAddresses || []).some(
                      (e) => e.emailAddress.toLowerCase() === "damanichiru38@gmail.com"
                    );

                  if (!isUserAdmin) return null;

                  const isAdminActive = pathname?.startsWith("/admin") ?? false;
                  return (
                    <Link
                      href="/admin/beta"
                      className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-300 ${
                        isAdminActive
                          ? "text-white"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {isAdminActive && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          transition={pillTransition}
                          className="absolute inset-0 rounded-2xl bg-white/[0.07] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_10px_-4px_rgba(0,0,0,0.6)] backdrop-blur-sm z-0"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-3">
                        <Shield
                          className={`w-4 h-4 transition-colors duration-300 ${
                            isAdminActive ? "text-[#2DD4BF]" : "text-neutral-400"
                          }`}
                          strokeWidth={1.6}
                        />
                        Admin Portal
                      </span>
                    </Link>
                  );
                })()}
              </div>
            </nav>

            {/* Bottom Usage & Action Box */}
            <div className="mt-auto pt-4">
              <div className="liquid-glass rounded-2xl p-4 border border-white/10 space-y-3">
                <p className="text-[10px] font-sans font-semibold text-neutral-400 uppercase tracking-widest">
                  Sarvam Usage
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-serif italic text-white">
                    ₹{estimatedCost.toFixed(2)}
                  </span>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-3">
                  <AudioMeter />

                  {isStreaming ? (
                    <div className="py-2 px-3 bg-red-950/40 border border-red-500/30 rounded-xl text-center">
                      <span className="text-red-400 text-xs font-medium flex items-center justify-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                        </span>
                        Live via OBS
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPreflight(true)}
                      className="w-full py-2.5 px-4 bg-white text-black hover:bg-neutral-200 rounded-full text-xs font-semibold tracking-wide transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
                    >
                      <Lightning className="w-3.5 h-3.5 fill-current" weight="fill" />
                      Check Readiness
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-black">
          {/* Top Bar Header */}
          <header className="h-16 lg:h-20 flex items-center justify-between px-6 lg:px-10 shrink-0 border-b border-white/10 bg-black/80 backdrop-blur-md z-20">
            {/* Mobile Hamburger & Logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                className="p-2 rounded-xl liquid-glass border border-white/10 text-neutral-300 hover:text-white"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <List className="w-5 h-5" />
                )}
              </button>
              <Link href="/" className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                </span>
                <span className="font-sans font-bold text-xl text-white">
                  vaani
                </span>
              </Link>
            </div>

            {/* Left side stream status pill */}
            <div className="hidden lg:block">
              <StreamStatusPill status={streamStatus} />
            </div>

            {/* Right side user avatar pill */}
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                <StreamStatusPill status={streamStatus} />
              </div>
              <div className="flex items-center gap-3 liquid-glass px-3.5 py-1.5 rounded-full border border-white/10">
                <span className="hidden sm:inline text-xs font-semibold tracking-wider text-neutral-200 uppercase">
                  {user?.firstName || "CHIRAG"}
                </span>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox:
                        "w-7 h-7 rounded-full border border-white/20",
                    },
                  }}
                />
              </div>
            </div>
          </header>

          {/* Page Content Scrollable Area */}
          <main className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-10 py-6 lg:py-8 minimal-scrollbar">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-20 left-4 right-4 liquid-glass bg-black/95 rounded-2xl border border-white/10 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href) ?? false;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "liquid-glass text-white border border-white/20"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    pathname?.startsWith("/settings") ?? false
                      ? "liquid-glass text-white border border-white/20"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Gear className="w-5 h-5" />
                  Settings
                </Link>

                {(() => {
                  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
                  const isUserAdmin =
                    userEmail === "damanichiru38@gmail.com" ||
                    (user?.emailAddresses || []).some(
                      (e) => e.emailAddress.toLowerCase() === "damanichiru38@gmail.com"
                    );

                  if (!isUserAdmin) return null;

                  const isAdminActive = pathname?.startsWith("/admin") ?? false;
                  return (
                    <Link
                      href="/admin/beta"
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isAdminActive
                          ? "liquid-glass text-white border border-white/20"
                          : "text-neutral-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Shield className="w-5 h-5 text-[#2DD4BF]" />
                      Admin Portal
                    </Link>
                  );
                })()}
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-4 inset-x-4 h-16 liquid-glass rounded-full border border-white/10 z-40 flex items-center justify-around px-3 bg-black/80 backdrop-blur-xl">
        <Link
          href="/dashboard"
          className={`p-2.5 rounded-full transition-colors ${
            pathname === "/dashboard"
              ? "bg-white text-black"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <SquaresFour className="w-5 h-5" />
        </Link>
        <Link
          href="/channels"
          className={`p-2.5 rounded-full transition-colors ${
            pathname === "/channels"
              ? "bg-white text-black"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Broadcast className="w-5 h-5" />
        </Link>
        <button
          onClick={() => setShowPreflight(true)}
          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <Broadcast className="w-5 h-5" />
        </button>
        <Link
          href="/settings"
          className={`p-2.5 rounded-full transition-colors ${
            pathname === "/settings"
              ? "bg-white text-black"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Gear className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
