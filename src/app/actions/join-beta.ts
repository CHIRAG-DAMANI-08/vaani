"use server";

import { headers } from "next/headers";
import { createTransport } from "nodemailer";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";
import { rateLimit } from "@/lib/rate-limit";
import { isAcceptableEmail, normalizeEmailForDuplicateCheck } from "@/lib/email-policy";
import { hashDeviceId, checkDeviceCardinality, checkIpCardinality } from "@/lib/device-fingerprint";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT ?? "587", 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM ?? "Vaani <noreply@vaani.local>";

let transporter: ReturnType<typeof createTransport> | null = null;
if (smtpHost && smtpUser && smtpPass) {
  transporter = createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
}

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

  // 3. IP rate limits (skip in dev / for unidentifiable localhost IPs — every
  // localhost request shares one bucket, so the limiter would silently reject
  // all local testing after 3/hr. Better to log real-world abuse upstream.)
  const ip = await getClientIp();
  const isLocalhostIp = ip === "unknown" || ip === "::1" || ip === "127.0.0.1";
  const skipIpLimit = process.env.NODE_ENV !== "production" || isLocalhostIp;
  const ipHour = skipIpLimit ? { allowed: true } : rateLimit(`beta-ip-hour:${ip}`, { maxRequests: 3, windowMs: 60 * 60 * 1000 });
  const ipDay = skipIpLimit ? { allowed: true } : rateLimit(`beta-ip-day:${ip}`, { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 });
  if (!ipHour.allowed || !ipDay.allowed) {
    logger.warn({ ip }, "Beta application blocked by IP rate limit");
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

    // Send branded confirmation email via SMTP
    if (transporter) {
      const displayName = application.name ?? "there";
      const html = `
        <div style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="max-width:520px;margin:0 auto;padding:48px 24px;">
            <div style="text-align:center;margin-bottom:36px;">
              <div style="width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.03);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                <span style="font-family:Georgia,serif;font-style:italic;font-size:20px;color:#fff;">V</span>
              </div>
              <div style="font-family:Georgia,serif;font-style:italic;font-size:18px;color:#fff;letter-spacing:0.02em;">Vaani</div>
            </div>

            <div style="border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:rgba(255,255,255,0.02);padding:40px 32px;text-align:center;">
              <div style="font-family:Georgia,serif;font-style:italic;font-size:26px;color:#fff;margin-bottom:12px;">You're on the list, ${displayName}.</div>
              <p style="color:rgba(255,255,255,0.5);font-size:15px;line-height:1.6;margin:0 0 28px;">We've saved your spot on the Vaani beta waitlist. We'll email you the moment your seat opens up.</p>

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

      try {
        const info = await transporter.sendMail({
          from: smtpFrom,
          to: email,
          subject: "You're on the Vaani beta waitlist",
          html,
        });
        logger.info({ messageId: info.messageId, applicationId: application._id, to: email }, "Beta application email sent");
        await BetaApplication.updateOne({ _id: application._id }, { emailSent: true });
      } catch (error) {
        logger.error({ err: error, applicationId: application._id, to: email }, "Beta application email failed");
      }
    } else {
      logger.warn("SMTP not configured; beta application email not sent");
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