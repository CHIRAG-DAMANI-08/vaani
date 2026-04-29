"use client";

import { useState, useEffect } from "react";
import { AudioMeter } from "./dashboard/AudioMeter";
import { PreflightModal } from "@/app/components/PreflightModal";
import { OnboardingWizard } from "@/app/components/OnboardingWizard";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Radio,
  Settings,
  Play,
  Square,
  Menu,
  X,
  Bell,
  Search,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Channels", href: "/channels", icon: Radio },
];

function StreamStatusPill({ status }: { status: "ready" | "live" | "error" }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[13px] font-medium bg-white text-gray-500 shadow-sm border border-gray-100">
        Ready
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[13px] font-medium bg-[#10B981] text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]">
        <span className="relative flex h-[6px] w-[6px]">
          <span className="animate-[live-pulse_1.8s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-white" />
        </span>
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[13px] font-medium bg-[#EF4444] text-white shadow-sm border border-[#EF4444]/20">
      Error
    </span>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
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
          fetch("/api/obs/status")
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

    // Initialize the WebSocket Relay Client on the frontend so it can proxy events to the server
    import("@/lib/obs-relay-client").then((mod) => {
       mod.obsRelayManager.initRelay();

       // Subscribe to streaming state
       const unsubStream = mod.obsRelayManager.subscribeStreaming((streaming) => {
         setIsStreaming(streaming);
       });

       // Subscribe to session snapshots for cost
       const unsubSnapshot = mod.obsRelayManager.subscribeSnapshot((snapshot) => {
         setEstimatedCost(snapshot.stats?.estimatedCostINR ?? 0);
       });

       // Subscribe to errors — show as toasts
       const unsubError = mod.obsRelayManager.subscribeErrors((error) => {
         toast.error(error, {
           description: "Check your settings and try again.",
           duration: 5000,
         });
       });

       return () => {
         unsubStream();
         unsubSnapshot();
         unsubError();
       };
    });
  }, [pathname]);

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-[#F5F2ED] text-gray-900 font-sans">
      <OnboardingWizard />
      {showPreflight && (
        <PreflightModal 
          onClose={() => setShowPreflight(false)} 
          onStart={() => {
            setShowPreflight(false);
            // In a fully robust system, this might trigger the actual RTMP pipeline start.
            // Right now, the backend auto-starts when OBS streams, so this is just a readiness check.
          }} 
        />
      )}
      {/* ── Vibrant Floating Mesh Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute rounded-full filter blur-[100px] md:blur-[140px] opacity-70 animate-[float-slow_20s_ease-in-out_infinite]"
          style={{
            width: '80vw', height: '80vh', left: '-10%', top: '-10%',
            background: 'linear-gradient(135deg, #F9AB7F 0%, #F5CE98 100%)'
          }}
        />
        <div 
          className="absolute rounded-full filter blur-[120px] md:blur-[160px] opacity-60 animate-[float-slow_25s_ease-in-out_infinite_reverse]"
          style={{
            width: '70vw', height: '70vh', right: '-5%', bottom: '-10%',
            background: 'linear-gradient(135deg, #A78BFA 0%, #FDA4AF 100%)'
          }}
        />
         <div 
          className="absolute rounded-full filter blur-[100px] md:blur-[140px] opacity-50 animate-[float-slow_30s_ease-in-out_infinite]"
          style={{
            width: '60vw', height: '60vh', left: '30%', top: '40%',
            background: 'linear-gradient(135deg, #6EE7B7 0%, #3B82F6 100%)'
          }}
        />
      </div>

      {/* ── Padded Main Layout ── */}
      <div className="relative z-10 w-full h-full flex p-1 md:p-4 lg:p-6 gap-6">
        
        {/* Desktop Detached Sidebar (Pill) */}
        <aside className="hidden lg:flex flex-col w-[280px] glass-panel h-full shrink-0 relative overflow-hidden group">
          
          {/* Internal Sidebar Gradient Splash for depth */}
          <div className="absolute top-0 left-0 w-full h-[200px] bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-0" />
          
          <div className="relative z-10 flex flex-col h-full">
            {/* Logo */}
            <div className="h-[90px] flex items-center px-8">
              <Link href="/" className="font-syne font-bold text-[26px] tracking-tight text-gray-900 drop-shadow-sm">Vaani.</Link>
            </div>

            {/* Navigation Base */}
            <nav className="flex-1 px-5 space-y-2 mt-4">
              <p className="px-3 text-[11px] font-dm-sans font-bold uppercase tracking-[0.15em] text-gray-400 mb-4 mt-2">Menu</p>
              
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-4 px-4 py-[14px] rounded-[18px] text-[15px] font-medium transition-all duration-300 ${
                      isActive
                        ? "bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)] text-gray-900"
                        : "text-gray-500 hover:bg-white/40 hover:text-gray-900 hover:shadow-sm"
                    }`}
                  >
                    <div className={`flex items-center justify-center p-2 rounded-[12px] transition-colors ${isActive ? 'bg-[#FFF2E5] text-[#F5821F]' : 'bg-transparent text-gray-400'}`}>
                       <item.icon className="w-5 h-5" />
                    </div>
                    {item.label}
                  </Link>
                );
              })}
              
              {/* Other links */}
              <div className="pt-4 mt-4 border-t border-[rgba(0,0,0,0.04)]">
                 <p className="px-3 text-[11px] font-dm-sans font-bold uppercase tracking-[0.15em] text-gray-400 mb-4 mt-2">Personal</p>
                 <Link
                    href="/settings"
                    className={`flex items-center gap-4 px-4 py-[14px] rounded-[18px] text-[15px] font-medium transition-all duration-300 ${
                      pathname.startsWith('/settings')
                        ? "bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)] text-gray-900"
                        : "text-gray-500 hover:bg-white/40 hover:text-gray-900 hover:shadow-sm"
                    }`}
                  >
                    <div className={`flex items-center justify-center p-2 rounded-[12px] transition-colors ${pathname.startsWith('/settings') ? 'bg-[#FFF2E5] text-[#F5821F]' : 'bg-transparent text-gray-400'}`}>
                       <Settings className="w-5 h-5" />
                    </div>
                    Settings
                  </Link>
              </div>
            </nav>

            {/* Stream Action Card inside Sidebar */}
            <div className="p-5 mt-auto">
              <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.03)] border border-white/80 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br from-[#F5821F]/20 to-[#E8690A]/5 rounded-full blur-[20px]" />
                
                <p className="text-[12px] font-dm-sans font-bold text-gray-500 uppercase tracking-wider mb-1">Sarvam Usage</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-[28px] font-syne font-bold text-gray-900">₹{estimatedCost.toFixed(2)}</span>
                </div>
                


                <div className="mt-4 pt-4 border-t border-gray-100">
                  {/* Audio Level Meter */}
                  <AudioMeter />

                  {isStreaming ? (
                    <div className="mt-4 py-2 px-3 bg-[#EF4444]/10 rounded-lg text-center">
                       <span className="text-[#EF4444] text-[13px] font-medium flex items-center justify-center gap-2">
                         <span className="relative flex h-[6px] w-[6px]">
                            <span className="animate-[live-pulse_1.8s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75" />
                            <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#EF4444]" />
                          </span>
                         Live via OBS
                       </span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowPreflight(true)}
                      className="mt-4 w-full py-2 px-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-center transition-colors shadow-sm cursor-pointer"
                    >
                       <span className="text-gray-700 text-[12px] font-bold">Check Readiness</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Glass Panel */}
        <div className="flex-1 glass-panel h-[calc(100vh-8px)] md:h-full flex flex-col overflow-hidden relative">
          
          {/* Navbar inside Main Glass */}
          <header className="h-[80px] lg:h-[100px] flex items-center justify-between px-6 lg:px-10 shrink-0 z-20">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2.5 -ml-2 rounded-[14px] hover:bg-white/50 transition-colors shadow-sm bg-white/30 border border-white/50 text-gray-700"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="lg:hidden font-syne font-bold text-[22px] text-gray-900">Vaani.</div>

            {/* Global Search Bar (Visual) */}
            <div className="hidden lg:flex items-center bg-white/50 hover:bg-white/80 transition-colors border border-white shadow-sm rounded-[16px] px-4 py-2.5 w-[320px]">
              <Search className="w-4 h-4 text-gray-400 mr-3" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="bg-transparent border-none outline-none text-[14px] font-medium text-gray-700 w-full placeholder:text-gray-400"
              />
            </div>

            <div className="flex-1 lg:hidden" />

            {/* Right side Actions */}
            <div className="flex justify-end gap-4 lg:gap-6 items-center">
              <StreamStatusPill status={streamStatus} />
              
              <button className="hidden lg:flex p-2.5 rounded-[14px] bg-white/50 hover:bg-white text-gray-600 transition-all shadow-sm border border-white">
                 <div className="relative">
                   <Bell className="w-[18px] h-[18px]" />
                 </div>
              </button>

              <div className="flex items-center gap-3 bg-white/50 pl-3 pr-2 py-2 rounded-[16px] border border-white shadow-sm hover:bg-white transition-colors cursor-pointer">
                 <div className="hidden lg:block text-right pr-2">
                   <p className="text-[12px] font-dm-sans font-bold text-gray-800 uppercase">{user?.firstName || "User"}</p>
                 </div>
                 <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8 rounded-[10px] shadow-sm",
                    },
                  }}
                />
              </div>
            </div>
          </header>

          {/* Page Content Scrollable Area */}
          <main className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-10 pb-20 lg:pb-10 minimal-scrollbar">
               {children}
          </main>
        </div>
      </div>
      
      {/* ── Mobile Tab Bar (Floating Pill) ── */}
      <div className="lg:hidden fixed bottom-6 inset-x-6 h-[72px] glass-modal z-[60] flex items-center justify-around px-2">
        <Link href="/dashboard" className={`p-3 rounded-[16px] transition-all ${pathname === '/dashboard' ? 'bg-[#FFF2E5] text-[#F5821F]' : 'text-gray-400'}`}>
          <LayoutDashboard className="w-[22px] h-[22px]" />
        </Link>
        <Link href="/channels" className={`p-3 rounded-[16px] transition-all ${pathname === '/channels' ? 'bg-[#FFF2E5] text-[#F5821F]' : 'text-gray-400'}`}>
          <Radio className="w-[22px] h-[22px]" />
        </Link>

        {/* Preflight Center Action */}
        <button 
          onClick={() => setShowPreflight(true)}
          className="relative transform -translate-y-6 w-[56px] h-[56px] rounded-[20px] shadow-[0_12px_24px_rgba(245,130,31,0.35)] flex items-center justify-center text-white bg-gradient-to-br from-[#F5821F] to-[#E8690A] hover:scale-105 transition-transform"
        >
           <Radio className="w-[24px] h-[24px] fill-current" />
        </button>

        <Link href="/settings" className={`p-3 rounded-[16px] transition-all ${pathname === '/settings' ? 'bg-[#FFF2E5] text-[#F5821F]' : 'text-gray-400'}`}>
          <Settings className="w-[22px] h-[22px]" />
        </Link>
        <UserButton
           appearance={{
             elements: {
               avatarBox: "w-[30px] h-[30px] rounded-[10px]",
             },
           }}
        />
      </div>

    </div>
  );
}
