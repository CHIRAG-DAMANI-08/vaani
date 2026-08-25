import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import nodemailer from "nodemailer";

/**
 * Comprehensive tests for src/lib/email.ts
 *
 * Covers:
 *  - getTransporter: all credential permutations, port/secure logic, SMTP_FROM
 *  - sendEmail: success, failure, SMTP-not-configured, replyTo present/absent,
 *              SMTP_FROM fallback, messageId propagation, error propagation
 */

// Stash original env so we can restore after each test
const originalEnv = { ...process.env };

describe("Email Transport — getTransporter", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns null when SMTP_HOST is missing", async () => {
    delete process.env.SMTP_HOST;
    process.env.SMTP_USER = "user@test.com";
    process.env.SMTP_PASS = "pass";

    const { getTransporter } = await import("@/lib/email");
    expect(getTransporter()).toBeNull();
  });

  it("returns null when SMTP_USER is missing", async () => {
    process.env.SMTP_HOST = "smtp.test.com";
    delete process.env.SMTP_USER;
    process.env.SMTP_PASS = "pass";

    const { getTransporter } = await import("@/lib/email");
    expect(getTransporter()).toBeNull();
  });

  it("returns null when SMTP_PASS is missing", async () => {
    process.env.SMTP_HOST = "smtp.test.com";
    process.env.SMTP_USER = "user@test.com";
    delete process.env.SMTP_PASS;

    const { getTransporter } = await import("@/lib/email");
    expect(getTransporter()).toBeNull();
  });

  it("returns null when all SMTP vars are empty strings", async () => {
    process.env.SMTP_HOST = "";
    process.env.SMTP_USER = "";
    process.env.SMTP_PASS = "";

    const { getTransporter } = await import("@/lib/email");
    expect(getTransporter()).toBeNull();
  });

  it("creates transporter with correct config for port 587 (STARTTLS)", async () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user@gmail.com";
    process.env.SMTP_PASS = "app-password";

    const spy = vi.spyOn(nodemailer, "createTransport").mockReturnValue({} as any);

    const { getTransporter } = await import("@/lib/email");
    getTransporter();

    expect(spy).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: "user@gmail.com", pass: "app-password" },
    });
  });

  it("creates transporter with secure:true for port 465", async () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "user@gmail.com";
    process.env.SMTP_PASS = "app-password";

    const spy = vi.spyOn(nodemailer, "createTransport").mockReturnValue({} as any);

    const { getTransporter } = await import("@/lib/email");
    getTransporter();

    expect(spy).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: "user@gmail.com", pass: "app-password" },
    });
  });

  it("defaults to port 587 when SMTP_PORT is not set", async () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    delete process.env.SMTP_PORT;
    process.env.SMTP_USER = "user@gmail.com";
    process.env.SMTP_PASS = "app-password";

    const spy = vi.spyOn(nodemailer, "createTransport").mockReturnValue({} as any);

    const { getTransporter } = await import("@/lib/email");
    getTransporter();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false })
    );
  });
});

describe("Email Transport — sendEmail", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function setSmtpEnv() {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user@gmail.com";
    process.env.SMTP_PASS = "app-password";
    process.env.SMTP_FROM = "Vaani <noreply@vaani.live>";
  }

  // ── SMTP not configured ──────────────────────────────────────────

  it("returns success:false when SMTP is not configured", async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const { sendEmail } = await import("@/lib/email");
    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("SMTP not configured");
    expect(result.messageId).toBeUndefined();
  });

  // ── Successful send ──────────────────────────────────────────────

  it("returns success:true with messageId on successful send", async () => {
    setSmtpEnv();

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "<abc123@gmail.com>" });
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as any);

    const { sendEmail } = await import("@/lib/email");
    const result = await sendEmail({
      to: "recipient@example.com",
      subject: "Welcome",
      html: "<p>Content</p>",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("<abc123@gmail.com>");
    expect(result.error).toBeUndefined();
  });

  // ── Failed send ──────────────────────────────────────────────────

  it("returns success:false with error when sendMail throws", async () => {
    setSmtpEnv();

    const smtpError = new Error("Connection refused");
    const mockSendMail = vi.fn().mockRejectedValue(smtpError);
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as any);

    const { sendEmail } = await import("@/lib/email");
    const result = await sendEmail({
      to: "recipient@example.com",
      subject: "Will fail",
      html: "<p>Nope</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(smtpError);
    expect(result.messageId).toBeUndefined();
  });

  it("does NOT throw — errors are caught and returned", async () => {
    setSmtpEnv();

    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: vi.fn().mockRejectedValue(new Error("auth failed")),
    } as any);

    const { sendEmail } = await import("@/lib/email");

    await expect(
      sendEmail({ to: "x@y.com", subject: "t", html: "<p>h</p>" })
    ).resolves.toEqual(
      expect.objectContaining({ success: false })
    );
  });

  // ── replyTo handling ─────────────────────────────────────────────

  it("includes replyTo in sendMail when provided", async () => {
    setSmtpEnv();

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "with-reply" });
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as any);

    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: "recipient@example.com",
      subject: "Contact form",
      html: "<p>Message</p>",
      replyTo: "sender@example.com",
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: "Vaani <noreply@vaani.live>",
      to: "recipient@example.com",
      subject: "Contact form",
      html: "<p>Message</p>",
      replyTo: "sender@example.com",
    });
  });

  it("omits replyTo from sendMail when not provided", async () => {
    setSmtpEnv();

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "no-reply" });
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as any);

    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: "recipient@example.com",
      subject: "No reply-to",
      html: "<p>Content</p>",
    });

    const callArg = mockSendMail.mock.calls[0][0];
    expect(callArg).not.toHaveProperty("replyTo");
  });

  it("omits replyTo from sendMail when it is an empty string", async () => {
    setSmtpEnv();

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "empty-reply" });
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as any);

    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: "recipient@example.com",
      subject: "Empty replyTo",
      html: "<p>Content</p>",
      replyTo: "",
    });

    const callArg = mockSendMail.mock.calls[0][0];
    expect(callArg).not.toHaveProperty("replyTo");
  });

  // ── SMTP_FROM fallback ───────────────────────────────────────────

  it("uses SMTP_FROM env var for the from field", async () => {
    setSmtpEnv();
    process.env.SMTP_FROM = "Custom <custom@vaani.live>";

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "custom-from" });
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as any);

    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: "x@y.com",
      subject: "s",
      html: "<p>h</p>",
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Custom <custom@vaani.live>" })
    );
  });

  it("falls back to default from when SMTP_FROM is not set", async () => {
    setSmtpEnv();
    delete process.env.SMTP_FROM;

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "default-from" });
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as any);

    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: "x@y.com",
      subject: "s",
      html: "<p>h</p>",
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Vaani <noreply@vaani.live>" })
    );
  });

  // ── Correct parameters forwarded ─────────────────────────────────

  it("forwards to, subject, and html exactly as provided", async () => {
    setSmtpEnv();

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "exact-params" });
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as any);

    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: "beta-user@example.com",
      subject: "Welcome to the Vaani Beta \u2726",
      html: '<div style="background:#0a0a0a">Rich HTML</div>',
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: "Vaani <noreply@vaani.live>",
      to: "beta-user@example.com",
      subject: "Welcome to the Vaani Beta \u2726",
      html: '<div style="background:#0a0a0a">Rich HTML</div>',
    });
  });
});
