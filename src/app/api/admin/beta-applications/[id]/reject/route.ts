import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";

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
        status: "rejected",
        reviewedAt: new Date(),
        reviewedBy: admin.userId,
      },
      { new: true }
    );

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, application });
  } catch (error) {
    console.error("Reject beta application failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}