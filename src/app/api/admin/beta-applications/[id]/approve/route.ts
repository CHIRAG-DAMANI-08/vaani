import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";
import { BetaMembership } from "@/lib/models/beta-membership";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const application = await BetaApplication.findByIdAndUpdate(
      id,
      {
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: admin.userId,
      },
      { new: true }
    );

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Upsert BetaMembership — key by applicationEmail so the applicant's
    // Clerk account can claim access on first login via the layout guard.
    await BetaMembership.findOneAndUpdate(
      { applicationEmail: application.email },
      {
        $setOnInsert: {
          applicationEmail: application.email,
          clerkUserId: null,
          status: "approved",
          createdAt: new Date(),
        },
        $set: { status: "approved" },
      },
      { upsert: true }
    );

    // Send branded acceptance email via SMTP
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
            <div style="font-family:Georgia,serif;font-style:italic;font-size:26px;color:#fff;margin-bottom:12px;">You're in, ${displayName}.</div>
            <p style="color:rgba(255,255,255,0.5);font-size:15px;line-height:1.6;margin:0 0 28px;">Your beta application has been approved. You now have full access to the Vaani platform.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://vaani.live"}/sign-in" style="display:inline-block;background:#fff;color:#0a0a0a;font-size:14px;font-weight:600;padding:12px 32px;border-radius:9999px;text-decoration:none;letter-spacing:0.01em;">
              Sign In to Dashboard →
            </a>

            <div style="border-top:1px solid rgba(255,255,255,0.06);margin:32px 0 0;padding-top:24px;">
              <p style="color:rgba(255,255,255,0.35);font-size:13px;line-height:1.5;margin:0;">
                Real-time multilingual streaming.<br/>
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
      to: application.email,
      subject: "Welcome to the Vaani Beta ✦",
      html,
    });

    if (!emailResult.success) {
      logger.warn({ to: application.email, error: emailResult.error }, "Beta approval email failed to send");
    }

    return NextResponse.json({ ok: true, emailSent: emailResult.success, application });
  } catch (error) {
    console.error("Approve beta application failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}