import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left side — full-bleed image */}
      <div className="hidden lg:block lg:w-[50%] relative">
        <Image
          src="/auth-bg.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
      </div>

      {/* Right side — form area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar with logo — pinned top-left */}
        <header className="px-8 pt-6 pb-0 lg:px-10 lg:pt-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <span
              className="text-[22px] font-bold tracking-tight text-black"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              vaani
            </span>
            <span className="text-[13px] font-medium text-black/35 pt-0.5">
              API Dashboard
            </span>
          </Link>
        </header>

        {/* Form — vertically centered */}
        <main className="flex-1 flex items-center justify-center px-8 lg:px-10">
          <div className="w-full max-w-[380px]">{children}</div>
        </main>

        {/* Footer links */}
        <footer className="px-8 pb-6 pt-0 lg:px-10 lg:pb-8 flex justify-center gap-6">
          <Link
            href="/privacy"
            className="text-[11px] text-black/35 hover:text-black/55 transition-colors"
          >
            Privacy policy
          </Link>
          <Link
            href="/terms"
            className="text-[11px] text-black/35 hover:text-black/55 transition-colors"
          >
            Terms of service
          </Link>
        </footer>
      </div>
    </div>
  );
}
