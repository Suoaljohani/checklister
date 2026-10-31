import { connection, type NextRequest } from "next/server";
import { store } from "@/lib/store";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/public/checklists/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const s = store();
  const checklist = await s.get("checklists", id);
  if (!checklist || !checklist.active) return Response.json({ error: "Not found" }, { status: 404 });
  const department = await s.get("departments", checklist.department_id);
  return Response.json({ checklist, department });
}
