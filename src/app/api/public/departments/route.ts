import { connection } from "next/server";
import { store } from "@/lib/store";
import { zoned } from "@/lib/utils";

export async function GET() {
  await connection();
  const s = store();
  const [deps, checklists, recent] = await Promise.all([
    s.list("departments"),
    s.list("checklists"),
    s.submissions({ from: new Date(Date.now() - 36 * 3600e3).toISOString() }),
  ]);
  const today = zoned(new Date()).dayKey;
  const doneIds = new Set(recent.filter((r) => zoned(r.submitted_at).dayKey === today).map((r) => r.checklist_id));
  const visible = deps.filter((d) => d.active);
  const activeLists = checklists.filter((c) => c.active && visible.some((d) => d.id === c.department_id));
  return Response.json({
    departments: visible.map((d) => {
      const mine = activeLists.filter((c) => c.department_id === d.id);
      return { ...d, count: mine.length, done: mine.filter((c) => doneIds.has(c.id)).length };
    }),
    today: { done: activeLists.filter((c) => doneIds.has(c.id)).length, total: activeLists.length },
  });
}
