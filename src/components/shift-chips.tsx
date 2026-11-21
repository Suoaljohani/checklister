import { Check, Clock3, X } from "lucide-react";
import type { ShiftStatus } from "@/lib/shifts";
import { SHIFT_NAMES } from "@/lib/shifts";
import { cx, zoned } from "@/lib/utils";

const STATE = {
  done: { cls: "bg-green/15 text-green", en: "Done", ar: "مكتمل" },
  open: { cls: "bg-sky/15 text-sky ring-1 ring-sky/40", en: "Open now", ar: "متاح الآن" },
  upcoming: { cls: "bg-white/[0.07] text-ink-3", en: "Not started", ar: "لم يبدأ" },
  missed: { cls: "bg-danger/12 text-danger", en: "Missed", ar: "فات موعده" },
} as const;

/** One chip per shift: M ✓ · A open · N 23:30 */
export function ShiftChips({ statuses, className }: { statuses: ShiftStatus[]; className?: string }) {
  return (
    <div className={cx("flex flex-wrap gap-1", className)}>
      {statuses.map((s) => (
        <span
          key={s.code}
          className={cx("num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATE[s.state].cls)}
          title={`${SHIFT_NAMES[s.code].en} ${s.start}–${s.end} · ${STATE[s.state].en}`}
        >
          {s.code}
          {s.state === "done" && <Check className="h-3 w-3" strokeWidth={3} />}
          {s.state === "missed" && <X className="h-3 w-3" strokeWidth={3} />}
          {s.state === "open" && <span className="pulse-dot scale-75" aria-hidden />}
          {s.state === "upcoming" && <span className="font-medium">{s.start}</span>}
        </span>
      ))}
    </div>
  );
}

/** Full list for the checklist page: each shift with its window and state. */
export function ShiftList({ statuses }: { statuses: ShiftStatus[] }) {
  return (
    <div className="grid gap-1.5">
      {statuses.map((s) => (
        <div key={s.code} className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-3 py-2 text-[13px]">
          <span className="num grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.08] font-bold">{s.code}</span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold">{SHIFT_NAMES[s.code].en}</span>
            <span className="text-ink-3"> · {SHIFT_NAMES[s.code].ar}</span>
            <span className="num block text-[12px] text-ink-3">
              <Clock3 className="mr-1 inline h-3 w-3" />
              {s.start}–{s.end}
              {s.state === "done" && s.by && ` · ${s.by}${s.at ? ` · ${zoned(s.at).time}` : ""}`}
            </span>
          </span>
          <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATE[s.state].cls)}>
            {STATE[s.state].en} · {STATE[s.state].ar}
          </span>
        </div>
      ))}
    </div>
  );
}
