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