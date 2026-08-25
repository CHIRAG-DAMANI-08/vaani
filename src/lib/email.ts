import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: any }> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM ?? "Vaani <noreply@vaani.live>";

  if (!transporter) {
    logger.warn({ to, subject }, "SMTP not configured; email delivery skipped");
    return { success: false, error: "SMTP not configured" };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      ...(replyTo && { replyTo }),
    });
    logger.info({ messageId: info.messageId, to, subject }, "Email sent successfully");
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error({ err: error, to, subject }, "Failed to send email");
    return { success: false, error };
  }
}
