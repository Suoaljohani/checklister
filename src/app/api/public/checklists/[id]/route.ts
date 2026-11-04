import { connection, type NextRequest } from "next/server";
import { isUnlocked } from "@/lib/auth";
import { toClient } from "@/lib/entities";
import { store } from "@/lib/store";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/public/checklists/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const s = store();
  const checklist = await s.get("checklists", id);
  if (!checklist || !checklist.active) return Response.json({ error: "Not found" }, { status: 404 });
  const department = await s.get("departments", checklist.department_id);
  if (!(await isUnlocked(checklist)))
    return Response.json(
      { locked: true, checklist: { id: checklist.id, title_en: checklist.title_en, title_ar: checklist.title_ar, icon: checklist.icon, color: checklist.color }, department },
      { status: 403 },
    );
  return Response.json({ checklist: toClient(checklist), department });
}
