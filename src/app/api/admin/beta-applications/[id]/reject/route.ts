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

    const wasApproved = existingApp.status === "approved";

    const application = await BetaApplication.findByIdAndUpdate(
      id,
      {
        status: "rejected",
        reviewedAt: new Date(),
        reviewedBy: admin.userId,
      },
      { returnDocument: "after" }
    );

    // Revoke any existing BetaMembership for this email so they lose access immediately
    await BetaMembership.updateOne(
      { applicationEmail: existingApp.email.toLowerCase().trim() },
      { $set: { status: "revoked" } }
    );

    const rawName = (application?.name || existingApp?.name || "").trim();
    const userEmail = application?.email || existingApp.email;
    const fallbackUsername = userEmail.split("@")[0].replace(/[._-]/g, " ");
    const cleanFallback = fallbackUsername ? fallbackUsername.charAt(0).toUpperCase() + fallbackUsername.slice(1) : "there";
    const displayName = rawName.length > 0 ? rawName : cleanFallback;

    let emailSubject = "";
    let html = "";

    if (wasApproved) {
      // 1. Access Revoked Email
      emailSubject = "Vaani Beta Access Update — Access Revoked";
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
              <div style="display:inline-block;padding:4px 14px;border-radius:9999px;border:1px solid rgba(239,68,68,0.4);background:rgba(239,68,68,0.1);color:#F87171;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:20px;">
                Access Revoked
              </div>
              <div style="font-family:Georgia,serif;font-style:italic;font-size:26px;color:#ffffff;margin-bottom:14px;line-height:1.2;">
                Beta access updated for ${displayName}
              </div>
              <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 20px;">
                Hi ${displayName}, your beta access to the Vaani streaming platform has been revoked by an administrator.
              </p>
              <p style="color:rgba(255,255,255,0.65);font-size:14px;line-height:1.6;margin:0 0 28px;">
                Your account will no longer be able to ingest or translate real-time broadcast streams. If you believe this was done in error or would like to request reinstatement, please reply directly to this email.
              </p>

              <div style="border-top:1px solid rgba(255,255,255,0.08);margin:32px 0 0;padding-top:20px;">
                <p style="color:rgba(255,255,255,0.4);font-size:13px;line-height:1.5;margin:0;">
                  Questions or feedback? Just reply to this email.
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
      // 2. Application Rejection (Cohort Full) Email
      emailSubject = "Update regarding your Vaani Beta application";
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
              <div style="display:inline-block;padding:4px 14px;border-radius:9999px;border:1px solid rgba(239,68,68,0.4);background:rgba(239,68,68,0.1);color:#F87171;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:20px;">
                Cohort Update
              </div>
              <div style="font-family:Georgia,serif;font-style:italic;font-size:26px;color:#ffffff;margin-bottom:14px;line-height:1.2;">
                Update on your Vaani application
              </div>
              <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 20px;">
                Hi ${displayName}, thank you for your interest in Vaani.
              </p>
              <p style="color:rgba(255,255,255,0.65);font-size:14px;line-height:1.6;margin:0 0 20px;">
                Due to unprecedented demand and current pipeline capacity limits for our real-time AI speech engines, all available slots for this beta cohort are currently full.
              </p>
              <p style="color:rgba(255,255,255,0.65);font-size:14px;line-height:1.6;margin:0 0 28px;">
                We have placed your application on our priority queue for the next batch expansion. We will notify you immediately once additional streaming capacity opens up.
              </p>

              <div style="border-top:1px solid rgba(255,255,255,0.08);margin:32px 0 0;padding-top:20px;">
                <p style="color:rgba(255,255,255,0.4);font-size:13px;line-height:1.5;margin:0;">
                  Thank you for your patience and support.<br/>
                  Questions? Reply directly to this email.
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
      logger.warn({ to: userEmail, error: emailResult.error }, "Beta rejection/revocation email failed to send");
    }

    return NextResponse.json({ ok: true, emailSent: emailResult.success, wasApproved, application });
  } catch (error) {
    console.error("Reject/Revoke beta application failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}