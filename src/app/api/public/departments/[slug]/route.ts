import { connection, type NextRequest } from "next/server";
import { serverNow } from "@/lib/auth";
import { shiftStatuses, shiftsOf } from "@/lib/shifts";
import { store } from "@/lib/store";
import { toClient } from "@/lib/entities";
import { zoned } from "@/lib/utils";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/public/departments/[slug]">) {
  await connection();
  const { slug } = await ctx.params;
  const s = store();
  const department = (await s.list("departments")).find((d) => d.slug === slug && d.active);
  if (!department) return Response.json({ error: "Not found" }, { status: 404 });
  const checklists = (await s.list("checklists")).filter((c) => c.department_id === department.id && c.active);
  const now = serverNow(req);
  const today = zoned(now).dayKey;
  const recent = await s.submissions({ department_id: department.id, from: new Date(now.getTime() - 36 * 3600e3).toISOString() });
  const doneToday: Record<string, number> = {};
  for (const r of recent) if (zoned(r.submitted_at).dayKey === today) doneToday[r.checklist_id] = (doneToday[r.checklist_id] ?? 0) + 1;
  const withShifts = checklists.map((c) => {
    const w = shiftsOf(c);
    return { ...toClient(c), shift_status: w ? shiftStatuses(w, recent.filter((r) => r.checklist_id === c.id), now) : null };
  });
  return Response.json({ department, checklists: withShifts, doneToday });
}
