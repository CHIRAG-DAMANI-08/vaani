"use client";

import { useSignUp, useAuth, useClerk } from "@clerk/nextjs";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Eye, EyeSlash, CircleNotch } from "@phosphor-icons/react";

export default function SignUpPage() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [oauthError, setOauthError] = useState("");

  const isLoading = fetchStatus === "fetching" || !isLoaded;

  // Already signed in — bounce to the dashboard instead of showing the form.
  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/dashboard");
  }, [isLoaded, isSignedIn, router]);
  if (isLoaded && isSignedIn) return null;

  const handleSubmit = async (formData: FormData) => {
    const emailAddress = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signUp.password({ emailAddress, password });

    if (error) {
      logger.error({ err: error }, "Auth failed");
      return;
    }

    if (!error) await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async (formData: FormData) => {
    const code = formData.get("code") as string;
    await signUp.verifications.verifyEmailCode({ code });

    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/dashboard");
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    setGoogleLoading(true);
    setOauthError("");
    try {
      if ("authenticateWithRedirect" in signUp && typeof (signUp as any).authenticateWithRedirect === "function") {
        await (signUp as any).authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/dashboard",
        });
      } else {
        await signUp.sso({
          strategy: "oauth_google",
          redirectUrl: "/dashboard",
          redirectCallbackUrl: "/sso-callback",
        });
      }
    } catch (err) {
      logger.error({ err }, "Google OAuth exception");
      setOauthError("Failed to start Google sign up. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  if (signUp?.status === "complete") {
    return null;
  }

  /* ── Verification code view ── */
  if (
    signUp?.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1
            className="text-[28px] font-medium tracking-tight text-black"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Verify your email
          </h1>
          <p className="text-[14px] text-black/50">
            We sent a 6-digit code to your email address.
          </p>
        </div>

        <form action={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              placeholder="Enter verification code"
              autoComplete="one-time-code"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[14px] text-black outline-none placeholder:text-black/30 focus:border-black/25 focus:ring-2 focus:ring-black/5 transition-all"
            />
            {errors?.fields?.code && (
              <p className="text-[12px] text-red-500 pl-1">
                {errors.fields.code.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#f0f0f0] hover:bg-[#e4e4e4] active:scale-[0.98] text-black font-medium py-3 text-[14px] transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <CircleNotch className="w-4 h-4 animate-spin" />}
            Verify
          </button>
        </form>

        <button
          onClick={() => signUp.verifications.sendEmailCode()}
          className="text-[13px] text-black/40 hover:text-black/60 transition-colors"
        >
          Resend code
        </button>
      </div>
    );
  }

  /* ── Main sign-up form ── */
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1
          className="text-[28px] font-medium tracking-tight text-black"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Create your account
        </h1>
        <p className="text-[14px] text-black/50">
          Get started with Vaani in seconds.
        </p>
      </div>

      {/* Google Sign Up */}
      <button
        type="button"
        disabled={googleLoading}
        onClick={handleGoogleSignUp}
        className="w-full rounded-xl border border-black/10 bg-white hover:bg-black/[0.02] active:scale-[0.98] text-black font-medium py-3 text-[14px] transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-3"
      >
        {googleLoading ? (
          <CircleNotch className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        Sign up with Google
      </button>

      {oauthError && (
        <p className="text-[12px] text-red-500 text-center font-medium">
          {oauthError}
        </p>
      )}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-black/8" />
        </div>
        <div className="relative flex justify-center text-[11px] font-medium uppercase tracking-wider">
          <span className="bg-white px-3 text-black/30">Or continue with</span>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[14px] text-black outline-none placeholder:text-black/30 focus:border-black/25 focus:ring-2 focus:ring-black/5 transition-all"
          />
          {errors?.fields?.emailAddress && (
            <p className="text-[12px] text-red-500 pl-1">
              {errors.fields.emailAddress.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 pr-11 text-[14px] text-black outline-none placeholder:text-black/30 focus:border-black/25 focus:ring-2 focus:ring-black/5 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/50 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeSlash className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors?.fields?.password && (
            <p className="text-[12px] text-red-500 pl-1">
              {errors.fields.password.message}
            </p>
          )}
        </div>

        {/* Continue button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-[#f0f0f0] hover:bg-[#e4e4e4] active:scale-[0.98] text-black font-medium py-3 text-[14px] transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading && <CircleNotch className="w-4 h-4 animate-spin" />}
          Continue
        </button>
      </form>

      {/* Sign in link */}
      <p className="text-center text-[13px] text-black/45">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="text-[#3b3dbf] hover:text-[#2d2e94] font-medium underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>

      {/* Required for Clerk bot protection */}
      <div id="clerk-captcha" />
    </div>
  );
}
