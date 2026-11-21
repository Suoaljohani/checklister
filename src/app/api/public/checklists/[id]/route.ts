import { connection, type NextRequest } from "next/server";
import { accountsRequired, isLocked, readUnlockToken, serverNow } from "@/lib/auth";
import { nextShift, openShift, shiftStatuses, shiftsOf } from "@/lib/shifts";
import { toClient } from "@/lib/entities";
import { store } from "@/lib/store";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/public/checklists/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const s = store();
  const checklist = await s.get("checklists", id);
  if (!checklist || !checklist.active) return Response.json({ error: "Not found" }, { status: 404 });
  const department = await s.get("departments", checklist.department_id);
  if (isLocked(checklist) && !readUnlockToken(checklist.id, req.headers.get("x-unlock")))
    return Response.json(
      {
        locked: true,
        accounts: await accountsRequired(),
        checklist: { id: checklist.id, title_en: checklist.title_en, title_ar: checklist.title_ar, icon: checklist.icon, color: checklist.color },
        department,
      },
      { status: 403 },
    );
  // Shift-controlled: what is open now, what is done, and when the next window opens.
  const w = shiftsOf(checklist);
  let shift = null;
  if (w) {
    const now = serverNow(req);
    const recent = await s.submissions({ checklist_id: checklist.id, from: new Date(now.getTime() - 3 * 86400e3).toISOString() });
    const open = openShift(w, now);
    shift = {
      statuses: shiftStatuses(w, recent, now),
      open: open ? { code: open.window.code, date: open.date } : null,
      next: nextShift(w, now),
    };
  }
  return Response.json({ checklist: toClient(checklist), department, shift });
}
