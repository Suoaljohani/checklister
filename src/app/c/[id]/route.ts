import { connection, type NextRequest } from "next/server";
import { store } from "@/lib/store";

/**
 * Short, permanent link printed in checklist QR codes: /c/<checklist id>.
 * Looks up the department at scan time, so QR codes keep working if a department link changes.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/c/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const s = store();
  const checklist = await s.get("checklists", id);
  const department = checklist ? await s.get("departments", checklist.department_id) : null;
  const to = checklist?.active && department?.active ? `/d/${department.slug}/${checklist.id}` : department?.active ? `/d/${department.slug}` : "/";
  return Response.redirect(new URL(to, req.url), 307);
}
