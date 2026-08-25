"use server";

import { z } from "zod";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { CONTACT_EMAIL } from "@/lib/legal/constants";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().toLowerCase().email(),
  topic: z.string().trim().min(1).max(120),
  message: z.string().trim().min(10).max(5000),
});

export type ContactResponse =
  | { ok: true; state: "success"; message: "Thanks — your message is on its way." }
  | { ok: false; state: "validation_error"; message: string }
  | { ok: false; state: "server_error"; message: string };

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function sendContact(
  _prevState: ContactResponse | null,
  formData: FormData
): Promise<ContactResponse> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  // Spam guard: 5 submissions per minute per email address.
  const rl = rateLimit(`contact:${email}`, { maxRequests: 5, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return { ok: false, state: "server_error", message: "Too many messages. Please try again later." };
  }

  const parsed = schema.safeParse({
    name: formData.get("name") ?? undefined,
    email: rawEmail,
    topic: formData.get("topic"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      state: "validation_error",
      message: "Please enter your email, a subject, and a message of at least 10 characters.",
    };
  }

  const { name, email: to, topic, message } = parsed.data;
  const html = [
    `<p><strong>From:</strong> ${name ? `${esc(name)} <${esc(to)}>` : esc(to)}</p>`,
    `<p><strong>Subject:</strong> ${esc(topic)}</p>`,
    `<p><strong>Message:</strong></p>`,
    `<p>${esc(message).replace(/\n/g, "<br/>")}</p>`,
  ].join("");

  const emailResult = await sendEmail({
    to: CONTACT_EMAIL,
    replyTo: to,
    subject: `[Vaani contact] ${esc(topic)}`,
    html,
  });

  if (emailResult.success) {
    return { ok: true, state: "success", message: "Thanks — your message is on its way." };
  } else {
    logger.error({ error: emailResult.error }, "Contact send failed");
    return { ok: false, state: "server_error", message: "Something went wrong. Please try again." };
  }
}