"use server";

import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";
import { rateLimit } from "@/lib/rate-limit";
import { isAcceptableEmail, normalizeEmailForDuplicateCheck } from "@/lib/email-policy";
import { hashDeviceId, checkDeviceCardinality, checkIpCardinality } from "@/lib/device-fingerprint";
import { sendEmail } from "@/lib/email";

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
  const youtubeChannelRaw = formData.get("youtubeChannel");
  const youtubeChannel = typeof youtubeChannelRaw === "string" ? youtubeChannelRaw.trim() : undefined;
  const channelTitleRaw = formData.get("channelTitle");
  const channelTitle = typeof channelTitleRaw === "string" ? channelTitleRaw.trim() : undefined;
  const subscriberCountRaw = formData.get("subscriberCount");
  const subscriberCount = typeof subscriberCountRaw === "string" ? subscriberCountRaw.trim() : undefined;
  const channelAvatarRaw = formData.get("channelAvatar");
  const channelAvatar = typeof channelAvatarRaw === "string" ? channelAvatarRaw.trim() : undefined;
  const obsSetupRaw = formData.get("obsSetup");
  const obsSetup = obsSetupRaw === "needs_guide" ? "needs_guide" : "using_obs";
  const sarvamPreferenceRaw = formData.get("sarvamPreference");
  const sarvamPreference = sarvamPreferenceRaw === "bring_own" ? "bring_own" : "need_key";
  const reasonRaw = formData.get("reason");
  const reason = typeof reasonRaw === "string" ? reasonRaw.trim() : undefined;

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
      youtubeChannel,
      channelTitle,
      subscriberCount,
      channelAvatar,
      obsSetup,
      sarvamPreference,
      reason,
      status: reviewReason ? "review" : "pending",
      reviewReason,
      normalizedEmail,
      attemptCount: 1,
      emailSent: false,
    });

    // Send branded confirmation email via SMTP
    const rawName = (application.name || "").trim();
    const fallbackUsername = email.split("@")[0].replace(/[._-]/g, " ");
    const cleanFallback = fallbackUsername ? fallbackUsername.charAt(0).toUpperCase() + fallbackUsername.slice(1) : "there";
    const displayName = rawName.length > 0 ? rawName : cleanFallback;
    const html = `
      <div style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:520px;margin:0 auto;padding:48px 24px;">
          <div style="text-align:center;margin-bottom:32px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 12px;border-collapse:collapse;">
              <tr>
                <td align="center" valign="middle" style="width:42px;height:42px;border-radius:50%;border:2px solid #ffffff;background:rgba(255,255,255,0.05);text-align:center;vertical-align:middle;padding:0;">
                  <div style="width:14px;height:14px;border-radius:50%;background:#EF4444;margin:0 auto;display:inline-block;vertical-align:middle;">&nbsp;</div>
                </td>
              </tr>
            </table>
            <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:#fff;letter-spacing:0.03em;">vaani</div>
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

    const emailResult = await sendEmail({
      to: email,
      subject: "You're on the Vaani beta waitlist",
      html,
    });

    if (emailResult.success) {
      await BetaApplication.updateOne({ _id: application._id }, { emailSent: true });
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