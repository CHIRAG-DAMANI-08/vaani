"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { WaitlistEntry } from "@/lib/models/waitlist-entry";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(100).optional(),
  source: z.string().trim().max(100).optional(),
  campaign: z.string().trim().max(100).optional(),
  referrer: z.string().trim().max(300).optional(),
  feature_interest: z.string().trim().max(100).optional(),
});

export type WaitlistResponse =
  | { ok: true; state: "success"; message: "You're on the waitlist." }
  | { ok: false; state: "rate_limited"; message: "Too many requests. Please try again later." }
  | { ok: false; state: "validation_error"; message: "Enter a valid email." }
  | { ok: false; state: "server_error"; message: "Something went wrong. Please try again." };

export async function joinWaitlist(
  _prevState: WaitlistResponse | null,
  formData: FormData
): Promise<WaitlistResponse> {
  // Rate limit by IP (5 submissions per hour)
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headersList.get("x-real-ip")
    || "unknown";

  const rateResult = rateLimit(`waitlist:${ip}`, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateResult.allowed) {
    return {
      ok: false,
      state: "rate_limited",
      message: "Too many requests. Please try again later.",
    };
  }

  const emailFieldValue = formData.get("email");
  const nameFieldValue = formData.get("name");

  const parsed = schema.safeParse({
    email: typeof emailFieldValue === 'string' ? emailFieldValue : '',
    name: nameFieldValue ? String(nameFieldValue) : undefined,
    source: formData.get("source") ? String(formData.get("source")) : undefined,
    campaign: formData.get("campaign") ? String(formData.get("campaign")) : undefined,
    referrer: formData.get("referrer") ? String(formData.get("referrer")) : undefined,
    feature_interest: formData.get("feature_interest")
      ? String(formData.get("feature_interest"))
      : undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      state: "validation_error",
      message: "Enter a valid email.",
    };
  }

  try {
    await connectToDatabase();

    await WaitlistEntry.create({
      ...parsed.data,
      status: "pending",
    });
  } catch (error: unknown) {
    // Duplicate key — treat same as success (prevents email enumeration)
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      // fall through to success response
    } else {
      console.error("Waitlist error:", error);
      return {
        ok: false,
        state: "server_error",
        message: "Something went wrong. Please try again.",
      };
    }
  }

  // Always return identical response for both success and duplicate
  return {
    ok: true,
    state: "success",
    message: "You're on the waitlist.",
  };
}
