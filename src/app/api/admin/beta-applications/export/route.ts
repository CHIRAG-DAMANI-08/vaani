import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";
import { buildBetaApplicationQuery, normalizeBetaStatus } from "@/lib/beta-application-admin";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = normalizeBetaStatus(searchParams.get("status"));
    const search = searchParams.get("search") ?? "";

    await connectToDatabase();
    const applications = await BetaApplication.find(buildBetaApplicationQuery({ status, search })).sort({ createdAt: -1 }).lean();

    const csvRows = [
      ["id", "name", "email", "status", "interests", "createdAt"],
      ...applications.map((app) => [
        String((app as any)._id ?? ""),
        String((app as any).name ?? ""),
        String((app as any).email ?? ""),
        String((app as any).status ?? ""),
        Array.isArray((app as any).interests) ? (app as any).interests.join("|") : "",
        (app as any).createdAt ? new Date((app as any).createdAt).toISOString() : "",
      ]),
    ];

    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="beta-applications-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export beta applications failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
