export type BetaApplicationAdminStatus = "all" | "pending" | "approved" | "rejected" | "review";

export function normalizeBetaStatus(status: string | null | undefined): BetaApplicationAdminStatus {
  const normalized = (status ?? "all").trim().toLowerCase();
  if (["pending", "approved", "rejected", "review"].includes(normalized)) return normalized as BetaApplicationAdminStatus;
  return "all";
}

export function buildBetaApplicationQuery(params: { status?: string | null; search?: string | null }) {
  const status = normalizeBetaStatus(params.status);
  const search = (params.search ?? "").trim();

  const query: Record<string, unknown> = {};
  if (status !== "all") query.status = status;

  if (search) {
    query.$or = [
      { email: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
    ];
  }

  return query;
}
