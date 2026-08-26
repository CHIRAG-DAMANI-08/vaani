/**
 * Skeleton loader components matching Vaani's glass-morphism design.
 *
 * Uses a subtle shimmer animation on a translucent white surface
 * to feel native to the glass-panel / glass-card design system.
 */

function Shimmer() {
  return (
    <div className="absolute inset-0 -translate-x-full animate-[skeleton-shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
  );
}

function Base({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`relative overflow-hidden rounded-[14px] bg-white/[0.06] ${className}`} style={style}>
      <Shimmer />
    </div>
  );
}

export function SkeletonText({ className = "" }: { className?: string }) {
  return <Base className={`h-[16px] w-3/4 ${className}`} />;
}

export function SkeletonTitle({ className = "" }: { className?: string }) {
  return <Base className={`h-[24px] w-1/3 ${className}`} />;
}

export function SkeletonHeading({ className = "" }: { className?: string }) {
  return <Base className={`h-[28px] w-[200px] ${className}`} />;
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <Base className="rounded-full" style={{ width: size, height: size }} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`liquid-glass p-5 ${className}`}>
      <div className="space-y-3">
        <Base className="h-[14px] w-1/3" />
        <Base className="h-[20px] w-2/3" />
        <Base className="h-[14px] w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonPill({ className = "" }: { className?: string }) {
  return <Base className={`h-[32px] w-[80px] rounded-full ${className}`} />;
}

export function SkeletonInput({ className = "" }: { className?: string }) {
  return <Base className={`h-[48px] w-full rounded-[12px] ${className}`} />;
}

export function SkeletonButton({ className = "" }: { className?: string }) {
  return <Base className={`h-[44px] w-[120px] rounded-[12px] ${className}`} />;
}

/**
 * Full-page dashboard skeleton — matches the Dashboard layout with
 * sidebar + main panel structure. Used in loading.tsx files.
 */
export function DashboardPageSkeleton() {
  return (
    <div className="animate-[fade-in_300ms_ease-out] space-y-8">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonTitle className="h-[28px] w-[180px]" />
          <SkeletonText className="h-[14px] w-[260px]" />
        </div>
        <div className="hidden md:flex items-center gap-3">
          <SkeletonPill className="w-[100px]" />
          <SkeletonButton className="w-[140px]" />
        </div>
      </div>

      {/* Channel status cards */}
      <div>
        <div className="h-[12px] w-[100px] rounded bg-white/10 mb-4 font-sans text-[12px] font-bold uppercase tracking-[0.2em]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>

      {/* Pipeline monitor placeholder */}
      <div className="liquid-glass p-6">
        <div className="flex items-center gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 flex items-center gap-3">
              <SkeletonCircle size={36} />
              <div className="flex-1 space-y-2">
                <Base className="h-[12px] w-2/3" />
                <Base className="h-[20px] w-1/2" />
              </div>
              {i < 4 && <div className="w-[40px] h-[2px] rounded bg-white/10" />}
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="liquid-glass p-5 flex flex-col items-start gap-2">
            <SkeletonCircle size={28} />
            <Base className="h-[24px] w-[60px]" />
            <Base className="h-[12px] w-[80px]" />
          </div>
        ))}
      </div>

      {/* Transcript area */}
      <div className="liquid-glass p-5">
        <Base className="h-[12px] w-[80px] mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Base className="h-[14px] w-[50px] shrink-0" />
              <Base className="h-[14px] w-full" style={{ maxWidth: `${60 + i * 10}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Past sessions */}
      <div>
        <Base className="h-[12px] w-[100px] mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="liquid-glass p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SkeletonCircle size={32} />
                <div className="space-y-2">
                  <Base className="h-[14px] w-[140px]" />
                  <Base className="h-[12px] w-[100px]" />
                </div>
              </div>
              <SkeletonPill className="w-[70px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Settings page skeleton.
 */
export function SettingsPageSkeleton() {
  return (
    <div className="animate-[fade-in_300ms_ease-out] space-y-8">
      {/* Page heading */}
      <div className="space-y-2">
        <SkeletonHeading />
        <SkeletonText className="w-[300px]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Key section */}
        <div className="liquid-glass p-6 space-y-5">
          <div className="flex items-center justify-between">
            <SkeletonTitle className="w-[140px]" />
            <SkeletonPill className="w-[90px]" />
          </div>
          <SkeletonInput />
          <div className="flex gap-3">
            <SkeletonButton className="w-[130px]" />
            <SkeletonButton className="w-[130px]" />
          </div>
        </div>

        {/* OBS section */}
        <div className="liquid-glass p-6 space-y-5">
          <div className="flex items-center justify-between">
            <SkeletonTitle className="w-[160px]" />
            <SkeletonPill className="w-[90px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SkeletonInput />
            <SkeletonInput />
          </div>
          <SkeletonInput />
          <SkeletonButton className="w-full" />
        </div>

        {/* TTS section */}
        <div className="liquid-glass p-6 space-y-5">
          <SkeletonTitle className="w-[120px]" />
          <SkeletonInput />
          <div className="space-y-2">
            <Base className="h-[14px] w-[80px]" />
            <Base className="h-[6px] w-full rounded-full" />
          </div>
          <SkeletonInput />
        </div>

        {/* Stream settings section */}
        <div className="liquid-glass p-6 space-y-5">
          <SkeletonTitle className="w-[140px]" />
          <SkeletonInput />
          <SkeletonInput />
          <SkeletonInput />
        </div>
      </div>
    </div>
  );
}

/**
 * Channels page skeleton.
 */
export function ChannelsPageSkeleton() {
  return (
    <div className="animate-[fade-in_300ms_ease-out] space-y-8">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonHeading />
          <SkeletonText className="w-[280px]" />
        </div>
      </div>

      {/* Channel cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="liquid-glass p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonCircle size={32} />
                <div className="space-y-2">
                  <Base className="h-[16px] w-[80px]" />
                  <Base className="h-[12px] w-[60px]" />
                </div>
              </div>
              <SkeletonPill className="w-[60px]" />
            </div>
            <div className="space-y-2">
              <Base className="h-[12px] w-[60px]" />
              <SkeletonInput className="h-[38px]" />
            </div>
            <div className="flex items-center justify-between">
              <SkeletonPill className="w-[70px]" />
              <SkeletonButton className="w-[80px] h-[34px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
