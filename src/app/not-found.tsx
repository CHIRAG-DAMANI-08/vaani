import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center px-6">
      <div className="glass-card p-10 max-w-md text-center space-y-6">
        <p className="text-6xl font-syne font-bold text-[#F5821F]">404</p>
        <h1 className="text-xl font-semibold text-gray-900">Page not found</h1>
        <p className="text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
