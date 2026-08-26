import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";
import { buildBetaApplicationQuery, normalizeBetaStatus } from "@/lib/beta-application-admin";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = normalizeBetaStatus(searchParams.get("status"));
    const search = searchParams.get("search") ?? "";
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    await connectToDatabase();

    // Sync any existing WaitlistEntry documents that are not yet in BetaApplication
    try {
      const { WaitlistEntry } = await import("@/lib/models/waitlist-entry");
      const waitlistEntries = await WaitlistEntry.find({}).lean();
      for (const entry of waitlistEntries) {
        if (!entry.email) continue;
        const normalized = entry.email.toLowerCase().trim();
        const existing = await BetaApplication.findOne({
          $or: [{ email: normalized }, { normalizedEmail: normalized }],
        });
        if (!existing) {
          await BetaApplication.create({
            email: normalized,
            name: entry.name || null,
            interests: entry.feature_interest ? [entry.feature_interest] : [],
            status: entry.status === "invited" || entry.status === "converted" ? "approved" : "pending",
            attemptCount: entry.attemptCount || 1,
            emailSent: entry.emailSent || false,
            createdAt: entry.createdAt || new Date(),
          });
        }
      }
    } catch (syncErr) {
      console.warn("Waitlist sync warning:", syncErr);
    }

    const pageNumber = Number.isFinite(page) && page > 0 ? page : 1;
    const limitNumber = Number.isFinite(limit) && limit > 0 ? limit : 20;
    const skip = (pageNumber - 1) * limitNumber;

    const query = buildBetaApplicationQuery({ status, search });
    const [applications, total] = await Promise.all([
      BetaApplication.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      BetaApplication.countDocuments(query),
    ]);

    return NextResponse.json({
      applications,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNumber)),
      },
    });
  } catch (error) {
    console.error("Admin beta applications fetch failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}