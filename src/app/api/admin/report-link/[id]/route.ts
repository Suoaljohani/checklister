import { type NextRequest } from "next/server";
import { isAdmin, reportToken, unauthorized } from "@/lib/auth";

/** The secret part of a checklist's "latest report" QR link. Admin only. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/admin/report-link/[id]">) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  return Response.json({ token: reportToken(id) });
}
