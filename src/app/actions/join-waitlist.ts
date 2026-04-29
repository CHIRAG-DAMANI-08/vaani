"use server";

import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { WaitlistEntry } from "@/lib/models/waitlist-entry";

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
  | { ok: true; state: "duplicate"; message: "You're already on the waitlist." }
  | { ok: false; state: "validation_error"; message: "Enter a valid email." }
  | { ok: false; state: "server_error"; message: "Something went wrong. Please try again." };

export async function joinWaitlist(
  _prevState: WaitlistResponse | null,
  formData: FormData
): Promise<WaitlistResponse> {
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

    return {
      ok: true,
      state: "success",
      message: "You're on the waitlist.",
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return {
        ok: true,
        state: "duplicate",
        message: "You're already on the waitlist.",
      };
    }

    // Log the actual server error to the console for debugging
    console.error("Waitlist error:", error);
    
    return {
      ok: false,
      state: "server_error",
      message: "Something went wrong. Please try again.",
    };
  }
}
