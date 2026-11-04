import { connection, type NextRequest } from "next/server";
import { store } from "@/lib/store";
import { toClient } from "@/lib/entities";
import { zoned } from "@/lib/utils";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/public/departments/[slug]">) {
  await connection();
  const { slug } = await ctx.params;
  const s = store();
  const department = (await s.list("departments")).find((d) => d.slug === slug && d.active);
  if (!department) return Response.json({ error: "Not found" }, { status: 404 });
  const checklists = (await s.list("checklists")).filter((c) => c.department_id === department.id && c.active);
  const today = zoned(new Date()).dayKey;
  const recent = await s.submissions({ department_id: department.id, from: new Date(Date.now() - 36 * 3600e3).toISOString() });
  const doneToday: Record<string, number> = {};
  for (const r of recent) if (zoned(r.submitted_at).dayKey === today) doneToday[r.checklist_id] = (doneToday[r.checklist_id] ?? 0) + 1;
  return Response.json({ department, checklists: checklists.map(toClient), doneToday });
}
