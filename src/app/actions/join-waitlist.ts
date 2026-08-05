"use server";

import { z } from "zod";
import { Resend } from "resend";
import { logger } from "@/lib/logger";
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

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL ?? "Vaani <onboarding@resend.dev>";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export type WaitlistResponse =
  | { ok: true; state: "success"; message: "You're on the waitlist." }
  | { ok: true; state: "duplicate"; message: "You're already on the waitlist." }
  | { ok: false; state: "validation_error"; message: "Enter a valid email." }
  | { ok: false; state: "server_error"; message: "Something went wrong. Please try again." | "Too many attempts. Please try again later." };

export async function joinWaitlist(
  _prevState: WaitlistResponse | null,
  formData: FormData
): Promise<WaitlistResponse> {
  // Rate limit: 5 submissions per minute per email
  const emailRaw = formData.get("email");
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  const rl = rateLimit(`waitlist:${email}`, { maxRequests: 5, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return {
      ok: false,
      state: "server_error",
      message: "Too many attempts. Please try again later.",
    };
  }

  const emailFieldValue = emailRaw;
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

    if (resend) {
      const displayName = parsed.data.name ?? "there";

      try {
        await resend.emails.send({
          from: resendFrom,
          to: parsed.data.email,
          subject: "You're on the Vaani waitlist",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 560px; margin: 0 auto; padding: 24px;">
              <h1 style="font-size: 24px; margin: 0 0 16px;">You're on the Vaani waitlist</h1>
              <p style="margin: 0 0 16px;">Hi ${displayName},</p>
              <p style="margin: 0 0 16px;">Thanks for joining the beta. We’ve saved your spot and will email you when Vaani opens up for more creators.</p>
              <p style="margin: 0;">If you have any questions, just reply to this message.</p>
            </div>
          `,
        });
      } catch (error) {
        logger.error({ err: error }, "Waitlist confirmation email failed");
      }
    } else {
      logger.warn("RESEND_API_KEY is not configured; waitlist email was not sent");
    }

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
    logger.error({ err: error }, "Waitlist join failed");
    
    return {
      ok: false,
      state: "server_error",
      message: "Something went wrong. Please try again.",
    };
  }
}
