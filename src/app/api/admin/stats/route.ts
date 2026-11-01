import { connection } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { store } from "@/lib/store";
import type { Checklist, FieldValue, Stats } from "@/lib/types";
import { formatValue, zoned } from "@/lib/utils";

const DAY = 86400e3;

export async function GET() {
  await connection();
  if (!(await isAdmin())) return unauthorized();
  const s = store();
  const now = new Date();
  const [deps, checklists, subs] = await Promise.all([
    s.list("departments"),
    s.list("checklists"),
    s.submissions({ from: new Date(now.getTime() - 31 * DAY).toISOString() }),
  ]);
  const all = (await s.submissions({ limit: 100000 })).length;

  const todayKey = zoned(now).dayKey;
  const monthKey = todayKey.slice(0, 7);
  const weekAgo = new Date(now.getTime() - 7 * DAY).toISOString();
  const keyed = subs.map((x) => ({ ...x, day: zoned(x.submitted_at).dayKey }));
  const active = checklists.filter((c) => c.active);
  const depName = new Map(deps.map((d) => [d.id, d.name_en]));
  const chkById = new Map(checklists.map((c) => [c.id, c]));

  const trend: Stats["trend"] = [];
  for (let i = 13; i >= 0; i--) {
    const k = zoned(new Date(now.getTime() - i * DAY)).dayKey;
    const day = keyed.filter((x) => x.day === k);
    trend.push({ date: k, count: day.length, flagged: day.filter((x) => x.flagged).length });
  }

  const doneToday = new Set(keyed.filter((x) => x.day === todayKey).map((x) => x.checklist_id));

  const per_checklist: Stats["per_checklist"] = active.map((c) => {
    const mine = keyed.filter((x) => x.checklist_id === c.id);
    const primary = c.fields.find((f) => f.type === "number");
    return {
      id: c.id,
      title_en: c.title_en,
      title_ar: c.title_ar,
      icon: c.icon,
      color: c.color,
      department: depName.get(c.department_id) ?? "",
      done_today: doneToday.has(c.id),
      month_count: mine.filter((x) => x.day.startsWith(monthKey)).length,
      last_at: mine[0]?.submitted_at ?? null,
      series: primary
        ? mine
            .slice(0, 14)
            .reverse()
            .map((x) => ({ at: x.submitted_at, value: typeof x.values[primary.key] === "number" ? (x.values[primary.key] as number) : null }))
        : [],
      primary_label: primary?.label_en ?? "",
      primary_unit: primary?.unit ?? "",
      min: primary?.min ?? null,
      max: primary?.max ?? null,
    };
  });

  const staff = new Map<string, number>();
  for (const x of keyed.filter((x) => x.day.startsWith(monthKey))) staff.set(x.employee_name, (staff.get(x.employee_name) ?? 0) + 1);

  const stats: Stats = {
    generated_at: now.toISOString(),
    totals: {
      today: keyed.filter((x) => x.day === todayKey).length,
      week: subs.filter((x) => x.submitted_at >= weekAgo).length,
      month: keyed.filter((x) => x.day.startsWith(monthKey)).length,
      all,
      flagged_month: keyed.filter((x) => x.flagged && x.day.startsWith(monthKey)).length,
    },
    compliance_today: { done: active.filter((c) => doneToday.has(c.id)).length, expected: active.length },
    trend,
    per_checklist,
    recent: subs.slice(0, 8).map((x) => {
      const c = chkById.get(x.checklist_id);
      return {
        id: x.id,
        checklist: c?.title_en ?? "Deleted checklist",
        icon: c?.icon ?? "ClipboardCheck",
        color: c?.color ?? "#1691D0",
        employee_name: x.employee_name,
        submitted_at: x.submitted_at,
        flagged: x.flagged,
        summary: c ? summarize(c, x.values) : "",
      };
    }),
    top_staff: [...staff.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
  };
  return Response.json(stats);
}

function summarize(c: Checklist, values: Record<string, FieldValue>) {
  const checks = c.fields.filter((f) => f.type === "check");
  const parts: string[] = [];
  if (checks.length) {
    const missing = checks.filter((f) => values[f.key] === false).length;
    parts.push(`${checks.length - missing}/${checks.length} ✓${missing ? ` · ${missing} missing` : ""}`);
  }
  for (const f of c.fields) if (f.type !== "check" && f.type !== "heading") parts.push(formatValue(f, values[f.key]));
  return parts.filter(Boolean).slice(0, 6).join(" · ");
}
