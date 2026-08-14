"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";
import { rateLimit } from "@/lib/rate-limit";
import { isAcceptableEmail, normalizeEmailForDuplicateCheck } from "@/lib/email-policy";
import { hashDeviceId, checkDeviceCardinality, checkIpCardinality } from "@/lib/device-fingerprint";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL ?? "Vaani <onboarding@resend.dev>";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export type JoinBetaResponse =
  | { ok: true; state: "success"; message: string }
  | { ok: true; state: "review"; message: string }
  | { ok: true; state: "duplicate"; message: string }
  | { ok: false; state: "validation_error"; message: string }
  | { ok: false; state: "server_error"; message: string };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded && process.env.TRUST_PROXY === "true") {
    return forwarded.split(",")[0].trim();
  }
  return forwarded?.split(",")[0].trim() ?? "unknown";
}

export async function joinBeta(
  _prevState: JoinBetaResponse | null,
  formData: FormData
): Promise<JoinBetaResponse> {
  const emailRaw = formData.get("email");
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  const nameRaw = formData.get("name");
  const name = typeof nameRaw === "string" ? nameRaw.trim() : undefined;
  const deviceIdRaw = formData.get("deviceId");
  const deviceId = typeof deviceIdRaw === "string" ? deviceIdRaw : "";
  const interestsRaw = formData.get("interests");
  const interests = typeof interestsRaw === "string"
    ? interestsRaw.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  // 1. Email rate limit (5/min per email)
  const rl = rateLimit(`beta:${email}`, { maxRequests: 5, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return { ok: false, state: "server_error", message: "Too many attempts. Please try again later." };
  }

  // 2. Email validation (format, disposable, test, role)
  const emailCheck = isAcceptableEmail(email);
  if (!emailCheck.ok) {
    const messages: Record<string, string> = {
      invalid_format: "Enter a valid email.",
      disposable_domain: "Please use a permanent email address.",
      test_email: "Enter a real email address.",
      role_address: "Role addresses (admin@, info@, etc.) are not accepted.",
    };
    return { ok: false, state: "validation_error", message: messages[emailCheck.reason] ?? "Invalid email." };
  }

  // 3. IP rate limits
  const ip = await getClientIp();
  const ipHour = rateLimit(`beta-ip-hour:${ip}`, { maxRequests: 3, windowMs: 60 * 60 * 1000 });
  const ipDay = rateLimit(`beta-ip-day:${ip}`, { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 });
  if (!ipHour.allowed || !ipDay.allowed) {
    return { ok: false, state: "server_error", message: "Too many applications from this network." };
  }

  // 4. Device hash + cardinality
  const deviceHash = deviceId ? hashDeviceId(deviceId) : null;
  let reviewReason: string | null = null;
  if (deviceHash) {
    const { flagged } = await checkDeviceCardinality(deviceHash);
    if (flagged) reviewReason = "device_cardinality";
  }
  // 5. IP cardinality
  const { flagged: ipFlagged } = await checkIpCardinality(ip);
  if (ipFlagged && !reviewReason) reviewReason = "ip_cardinality";

  // 6. Normalized email for duplicate detection
  const normalizedEmail = normalizeEmailForDuplicateCheck(email);

  try {
    await connectToDatabase();

    // Check existing by raw or normalized email
    const existing = await BetaApplication.findOne({
      $or: [{ email }, { normalizedEmail }],
    });

    if (existing) {
      // Increment attempt count, never overwrite details
      await BetaApplication.updateOne(
        { _id: existing._id },
        { $inc: { attemptCount: 1 } }
      );
      return { ok: true, state: "duplicate", message: "You've already applied. We'll notify you when it's your turn!" };
    }

    // Create application
    const application = await BetaApplication.create({
      email,
      name,
      deviceHash,
      ipAddress: ip,
      interests,
      status: reviewReason ? "review" : "pending",
      reviewReason,
      normalizedEmail,
      attemptCount: 1,
      emailSent: false,
    });

    // Send confirmation email
    if (resend) {
      const displayName = application.name ?? "there";
      try {
        await resend.emails.send({
          from: resendFrom,
          to: email,
          subject: "You're on the Vaani beta waitlist",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 560px; margin: 0 auto; padding: 24px;">
              <h1 style="font-size: 24px; margin: 0 0 16px;">You're on the Vaani beta waitlist</h1>
              <p style="margin: 0 0 16px;">Hi ${displayName},</p>
              <p style="margin: 0 0 16px;">Thanks for applying to the beta. We've saved your spot and will email you when your seat opens up.</p>
              <p style="margin: 0;">If you have any questions, just reply to this message.</p>
            </div>
          `,
        });
        await BetaApplication.updateOne({ _id: application._id }, { emailSent: true });
      } catch (error) {
        logger.error({ err: error }, "Beta application email failed");
      }
    } else {
      logger.warn("RESEND_API_KEY not configured; beta application email not sent");
    }

    return {
      ok: true,
      state: reviewReason ? "review" : "success",
      message: reviewReason
        ? "Application submitted. Pending review."
        : "You're on the waitlist.",
    };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return { ok: true, state: "duplicate", message: "You've already applied. We'll notify you when it's your turn!" };
    }
    logger.error({ err: error }, "Beta application failed");
    return { ok: false, state: "server_error", message: "Something went wrong. Please try again." };
  }
}