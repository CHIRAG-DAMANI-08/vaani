"use server";

/**
 * @deprecated Replaced by join-beta action in join-beta.ts.
 * Kept for existing waitlist entries migration. New flow: /beta page → joinBeta action.
 */
import { z } from "zod";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb";
import { WaitlistEntry } from "@/lib/models/waitlist-entry";
import { rateLimit } from "@/lib/rate-limit";
import { decideJoin } from "@/lib/waitlist-policy";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(100).optional(),
  source: z.string().trim().max(100).optional(),
  campaign: z.string().trim().max(100).optional(),
  referrer: z.string().trim().max(300).optional(),
  feature_interest: z.string().trim().max(100).optional(),
});

export type WaitlistResponse =
  | { ok: true; state: "success"; message: "You’re on the waitlist." }
  | { ok: true; state: "duplicate"; message: "You’re already on the waitlist." }
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
    email: typeof emailFieldValue === "string" ? emailFieldValue : "",
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

    const existing = await WaitlistEntry.findOne({ email: parsed.data.email });

    const decision = decideJoin(
      existing
        ? { emailSent: existing.emailSent, attemptCount: existing.attemptCount }
        : null
    );

    if (decision.state === "duplicate") {
      return {
        ok: true,
        state: "duplicate",
        message: "You’re already on the waitlist.",
      };
    }
    if (decision.state === "blocked") {
      return {
        ok: false,
        state: "server_error",
        message: "Too many attempts. Please try again later.",
      };
    }

    // Count this attempt; keep first-submission details, never overwrite on retry.
    const entry = await WaitlistEntry.findOneAndUpdate(
      { email: parsed.data.email },
      {
        $inc: { attemptCount: 1 },
        $setOnInsert: { ...parsed.data, status: "pending", emailSent: false },
      },
      { upsert: true, new: true }
    );

    // Send branded confirmation email via SMTP (same template as join-beta)
    const displayName = entry?.name ?? parsed.data.name ?? "there";
    const html = `
      <div style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,’Segoe UI’,sans-serif;">
        <div style="max-width:520px;margin:0 auto;padding:48px 24px;">
          <div style="text-align:center;margin-bottom:36px;">
            <div style="width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.03);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
              <span style="font-family:Georgia,serif;font-style:italic;font-size:20px;color:#fff;">V</span>
            </div>
            <div style="font-family:Georgia,serif;font-style:italic;font-size:18px;color:#fff;letter-spacing:0.02em;">Vaani</div>
          </div>

          <div style="border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:rgba(255,255,255,0.02);padding:40px 32px;text-align:center;">
            <div style="font-family:Georgia,serif;font-style:italic;font-size:26px;color:#fff;margin-bottom:12px;">You’re on the list, ${displayName}.</div>
            <p style="color:rgba(255,255,255,0.5);font-size:15px;line-height:1.6;margin:0 0 28px;">We’ve saved your spot on the Vaani beta waitlist. We’ll email you the moment your seat opens up.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://vaani.live"}" style="display:inline-block;background:rgba(255,255,255,0.08);color:#fff;font-size:14px;font-weight:500;padding:12px 32px;border-radius:9999px;text-decoration:none;border:1px solid rgba(255,255,255,0.12);">
              Visit Vaani
            </a>

            <div style="border-top:1px solid rgba(255,255,255,0.06);margin:32px 0 0;padding-top:24px;">
              <p style="color:rgba(255,255,255,0.35);font-size:13px;line-height:1.5;margin:0;">
                Questions? Just reply to this email.
              </p>
            </div>
          </div>

          <div style="text-align:center;margin-top:28px;">
            <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">© ${new Date().getFullYear()} Vaani</p>
          </div>
        </div>
      </div>
    `;

    const emailResult = await sendEmail({
      to: parsed.data.email,
      subject: "You’re on the Vaani beta waitlist",
      html,
    });

    if (emailResult.success) {
      await WaitlistEntry.updateOne({ email: parsed.data.email }, { emailSent: true });
    } else {
      logger.warn({ to: parsed.data.email, error: emailResult.error }, "Waitlist confirmation email failed");
    }

    return {
      ok: true,
      state: "success",
      message: "You’re on the waitlist.",
    };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      // Race safety: concurrent upserts for the same email hit the unique index.
      return {
        ok: true,
        state: "duplicate",
        message: "You’re already on the waitlist.",
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
