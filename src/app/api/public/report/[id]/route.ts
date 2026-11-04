import { connection, type NextRequest } from "next/server";
import { checkReportToken } from "@/lib/auth";
import { toClient } from "@/lib/entities";
import { store } from "@/lib/store";
import { currentMonth, monthRange } from "@/lib/utils";

/** Everything needed to draw a checklist's monthly report, for holders of its report QR code. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/public/report/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const p = req.nextUrl.searchParams;
  if (!checkReportToken(id, p.get("t"))) return Response.json({ error: "This report link is not valid" }, { status: 403 });
  const s = store();
  const checklist = await s.get("checklists", id);
  if (!checklist) return Response.json({ error: "Not found" }, { status: 404 });
  const month = /^\d{4}-\d{2}$/.test(p.get("month") ?? "") ? p.get("month")! : currentMonth();
  const range = monthRange(month);
  const [department, settings, rows] = await Promise.all([
    s.get("departments", checklist.department_id),
    s.getSettings(),
    s.submissions({ checklist_id: id, from: range.from, to: range.to, withSignature: true }),
  ]);
  return Response.json(
    {
      checklist: toClient(checklist),
      department,
      settings: { header_en: settings.header_en, header_ar: settings.header_ar },
      month,
      rows: rows.sort((a, b) => (a.submitted_at < b.submitted_at ? -1 : 1)),
      generated_at: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
