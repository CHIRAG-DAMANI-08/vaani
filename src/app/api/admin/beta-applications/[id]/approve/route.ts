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

    const existingApp = await BetaApplication.findById(id);
    if (!existingApp) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const wasRevokedOrRejected = existingApp.status === "rejected";

    const application = await BetaApplication.findByIdAndUpdate(
      id,
      {
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: admin.userId,
      },
      { returnDocument: "after" }
    );

    // Upsert BetaMembership — key by applicationEmail so the applicant's
    // Clerk account can claim access on first login via the layout guard.
    try {
      await BetaMembership.findOneAndUpdate(
        { applicationEmail: existingApp.email.toLowerCase().trim() },
        {
          $setOnInsert: {
            applicationEmail: existingApp.email.toLowerCase().trim(),
            createdAt: new Date(),
          },
          $set: { status: "approved" },
        },
        { upsert: true }
      );
    } catch (membershipErr: any) {
      if (membershipErr?.code === 11000 && membershipErr?.keyPattern?.clerkUserId) {
        try {
          await BetaMembership.collection.dropIndex("clerkUserId_1");
          await BetaMembership.syncIndexes();
        } catch {
          // ignore drop errors
        }
        await BetaMembership.findOneAndUpdate(
          { applicationEmail: existingApp.email.toLowerCase().trim() },
          {
            $setOnInsert: {
              applicationEmail: existingApp.email.toLowerCase().trim(),
              createdAt: new Date(),
            },
            $set: { status: "approved" },
          },
          { upsert: true }
        );
      } else {
        throw membershipErr;
      }
    }

    // Send branded email via SMTP
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || "https://vaani.live").replace(/\/+$/, "");
    const rawName = (application?.name || existingApp?.name || "").trim();
    const userEmail = application?.email || existingApp.email;
    const fallbackUsername = userEmail.split("@")[0].replace(/[._-]/g, " ");
    const cleanFallback = fallbackUsername ? fallbackUsername.charAt(0).toUpperCase() + fallbackUsername.slice(1) : "there";
    const displayName = rawName.length > 0 ? rawName : cleanFallback;

    let emailSubject = "";
    let html = "";

    if (wasRevokedOrRejected) {
      // Re-enabled / Restored Access Email
      const signInUrl = `${appUrl}/sign-in`;
      emailSubject = "Your Vaani Beta Access has been Restored ✦";
      html = `
        <div style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;color:#ffffff;">
          <div style="max-width:540px;margin:0 auto;padding:48px 24px;">
            <div style="text-align:center;margin-bottom:32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 12px;border-collapse:collapse;">
                <tr>
                  <td align="center" valign="middle" style="width:42px;height:42px;border-radius:50%;border:2px solid #ffffff;background:rgba(255,255,255,0.05);text-align:center;vertical-align:middle;padding:0;">
                    <div style="width:14px;height:14px;border-radius:50%;background:#EF4444;margin:0 auto;display:inline-block;vertical-align:middle;">&nbsp;</div>
                  </td>
                </tr>
              </table>
              <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:#ffffff;letter-spacing:0.03em;">vaani</div>
            </div>

            <div style="border:1px solid rgba(255,255,255,0.12);border-radius:24px;background:rgba(255,255,255,0.03);padding:44px 36px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
              <div style="display:inline-block;padding:4px 14px;border-radius:9999px;border:1px solid rgba(45,212,191,0.4);background:rgba(45,212,191,0.1);color:#2DD4BF;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:20px;">
                Access Restored
              </div>
              <div style="font-family:Georgia,serif;font-style:italic;font-size:28px;color:#ffffff;margin-bottom:14px;line-height:1.2;">
                Your access is back, ${displayName}.
              </div>
              <p style="color:rgba(255,255,255,0.65);font-size:15px;line-height:1.6;margin:0 0 32px;">
                Your beta access to the Vaani streaming platform has been re-enabled and restored! You can now log back into the dashboard and stream in real time across all supported languages.
              </p>

              <a href="${signInUrl}" style="display:inline-block;background:#ffffff;color:#000000;font-size:15px;font-weight:700;padding:14px 36px;border-radius:9999px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 4px 20px rgba(255,255,255,0.2);">
                Sign In to Dashboard →
              </a>

              <div style="border-top:1px solid rgba(255,255,255,0.08);margin:36px 0 0;padding-top:24px;">
                <p style="color:rgba(255,255,255,0.4);font-size:13px;line-height:1.6;margin:0;">
                  Need assistance setting up OBS Studio or configuring destinations?<br/>
                  Reply directly to this email for support.
                </p>
              </div>
            </div>

            <div style="text-align:center;margin-top:32px;">
              <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Vaani · Real-time Multilingual Audio Translation
              </p>
            </div>
          </div>
        </div>
      `;
    } else {
      // First-time Approval Email (with direct sign-up CTA)
      const signUpUrl = `${appUrl}/sign-up`;
      emailSubject = "Welcome to the Vaani Beta ✦ Access Approved";
      html = `
        <div style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;color:#ffffff;">
          <div style="max-width:540px;margin:0 auto;padding:48px 24px;">
            <div style="text-align:center;margin-bottom:32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 12px;border-collapse:collapse;">
                <tr>
                  <td align="center" valign="middle" style="width:42px;height:42px;border-radius:50%;border:2px solid #ffffff;background:rgba(255,255,255,0.05);text-align:center;vertical-align:middle;padding:0;">
                    <div style="width:14px;height:14px;border-radius:50%;background:#EF4444;margin:0 auto;display:inline-block;vertical-align:middle;">&nbsp;</div>
                  </td>
                </tr>
              </table>
              <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:#ffffff;letter-spacing:0.03em;">vaani</div>
            </div>

            <div style="border:1px solid rgba(255,255,255,0.12);border-radius:24px;background:rgba(255,255,255,0.03);padding:44px 36px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
              <div style="display:inline-block;padding:4px 14px;border-radius:9999px;border:1px solid rgba(45,212,191,0.4);background:rgba(45,212,191,0.1);color:#2DD4BF;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:20px;">
                Access Granted
              </div>
              <div style="font-family:Georgia,serif;font-style:italic;font-size:28px;color:#ffffff;margin-bottom:14px;line-height:1.2;">
                You're in, ${displayName}.
              </div>
              <p style="color:rgba(255,255,255,0.65);font-size:15px;line-height:1.6;margin:0 0 32px;">
                Your beta application has been approved! You now have full access to Vaani&apos;s real-time multilingual AI streaming platform.
              </p>

              <a href="${signUpUrl}" style="display:inline-block;background:#ffffff;color:#000000;font-size:15px;font-weight:700;padding:14px 36px;border-radius:9999px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 4px 20px rgba(255,255,255,0.2);">
                Create Your Account →
              </a>

              <div style="border-top:1px solid rgba(255,255,255,0.08);margin:36px 0 0;padding-top:24px;">
                <p style="color:rgba(255,255,255,0.4);font-size:13px;line-height:1.6;margin:0;">
                  Already have an account with <strong>${userEmail}</strong>?<br/>
                  Your membership has been unlocked — simply sign in to get started.
                </p>
              </div>
            </div>

            <div style="text-align:center;margin-top:32px;">
              <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Vaani · Real-time Multilingual Audio Translation
              </p>
            </div>
          </div>
        </div>
      `;
    }

    const emailResult = await sendEmail({
      to: userEmail,
      subject: emailSubject,
      html,
    });

    if (!emailResult.success) {
      logger.warn({ to: userEmail, error: emailResult.error }, "Beta approval/restore email failed to send");
    }

    return NextResponse.json({ ok: true, emailSent: emailResult.success, wasRestored: wasRevokedOrRejected, application });
  } catch (error) {
    console.error("Approve/Restore beta application failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}