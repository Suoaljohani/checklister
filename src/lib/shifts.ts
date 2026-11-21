import type { Checklist, ShiftCode, ShiftWindow, Submission } from "./types";
import { TZ } from "./utils";

/*
 * Shift windows for checklists.
 * - All times are hospital time (Asia/Riyadh), never the phone's clock.
 * - A window includes its start minute and excludes its end minute (07:30 open, 10:30 closed).
 * - A window whose end is earlier than its start crosses midnight. Its "operating day" is the day it
 *   started: a check at 01:00 inside 23:30–02:00 belongs to the previous date.
 */

export const SHIFT_CODES: ShiftCode[] = ["M", "A", "N"];

export const SHIFT_NAMES: Record<ShiftCode, { en: string; ar: string }> = {
  M: { en: "Morning", ar: "الصباح" },
  A: { en: "Afternoon", ar: "العصر" },
  N: { en: "Night", ar: "الليل" },
};

export const DEFAULT_SHIFTS: ShiftWindow[] = [
  { code: "M", start: "07:30", end: "10:30" },
  { code: "A", start: "15:30", end: "18:30" },
  { code: "N", start: "23:30", end: "02:00" },
];

export type ShiftState = "upcoming" | "open" | "done" | "missed";

export type ShiftStatus = {
  code: ShiftCode;
  start: string;
  end: string;
  /** Operating date (YYYY-MM-DD) of the instance shown. */
  date: string;
  state: ShiftState;
  by?: string;
  at?: string;
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isTime(v: unknown): v is string {
  return typeof v === "string" && HHMM.test(v);
}

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** The checklist's shift windows, or null when it is not shift-controlled (older checklists). */
export function shiftsOf(c: Pick<Checklist, "shifts">): ShiftWindow[] | null {
  return Array.isArray(c.shifts) && c.shifts.length ? c.shifts : null;
}

/** Date and minute-of-day in hospital time. */
export function hospitalClock(now: Date, tz = TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, minute: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const crosses = (w: ShiftWindow) => mins(w.end) <= mins(w.start);

/** The window open right now and its operating date, or null. */
export function openShift(windows: ShiftWindow[], now: Date): { window: ShiftWindow; date: string } | null {
  const { day, minute } = hospitalClock(now);
  for (const w of windows) {
    const s = mins(w.start);
    const e = mins(w.end);
    if (!crosses(w)) {
      if (minute >= s && minute < e) return { window: w, date: day };
    } else if (minute >= s) return { window: w, date: day };
    else if (minute < e) return { window: w, date: addDays(day, -1) };
  }
  return null;
}

/** State of each shift for "today" (a midnight-crossing shift still open after midnight counts as today). */
export function shiftStatuses(
  windows: ShiftWindow[],
  subs: Pick<Submission, "shift_code" | "shift_date" | "employee_name" | "submitted_at">[],
  now: Date,
): ShiftStatus[] {
  const { day, minute } = hospitalClock(now);
  return windows.map((w) => {
    const s = mins(w.start);
    const e = mins(w.end);
    let date = day;
    let state: ShiftState;
    if (!crosses(w)) state = minute < s ? "upcoming" : minute < e ? "open" : "missed";
    else if (minute >= s) state = "open";
    else if (minute < e) {
      state = "open";
      date = addDays(day, -1);
    } else state = "upcoming";
    const done = subs.find((x) => x.shift_code === w.code && x.shift_date === date);
    return { code: w.code, start: w.start, end: w.end, date, state: done ? "done" : state, by: done?.employee_name, at: done?.submitted_at };
  });
}

/** Earliest window that opens later than now (wrapping to tomorrow). */
export function nextShift(windows: ShiftWindow[], now: Date) {
  const { minute } = hospitalClock(now);
  return [...windows].sort((a, b) => ((mins(a.start) - minute + 1440) % 1440) - ((mins(b.start) - minute + 1440) % 1440))[0] ?? null;
}

/** "Required once / twice / 3 times a day". */
export function frequencyLabel(n: number) {
  if (n === 1) return { en: "Required once a day", ar: "مطلوب مرة يوميًا" };
  if (n === 2) return { en: "Required twice a day", ar: "مطلوب مرتين يوميًا" };
  return { en: `Required ${n} times a day`, ar: `مطلوب ${n} مرات يوميًا` };
}

/** Validates admin input. Returns windows, null (not shift-controlled) or an error message. */
export function cleanShifts(v: unknown): ShiftWindow[] | null | string {
  if (v === null || v === undefined || v === false || (Array.isArray(v) && v.length === 0)) return null;
  if (!Array.isArray(v)) return "Shift settings are not valid";
  const out: ShiftWindow[] = [];
  for (const raw of v as Record<string, unknown>[]) {
    const code = raw?.code as ShiftCode;
    if (!SHIFT_CODES.includes(code)) return "Unknown shift";
    if (out.some((w) => w.code === code)) return `Shift ${code} is listed twice`;
    if (!isTime(raw.start) || !isTime(raw.end)) return `Enter start and end times for shift ${code}`;
    if (raw.start === raw.end) return `Shift ${code} must end at a different time than it starts`;
    out.push({ code, start: raw.start, end: raw.end });
  }
  // Windows must not overlap, otherwise one check could count for two shifts.
  const cover = (w: ShiftWindow) => {
    const s = mins(w.start);
    const e = mins(w.end);
    const set = new Set<number>();
    for (let m = s; m !== e; m = (m + 1) % 1440) set.add(m);
    return set;
  };
  for (let i = 0; i < out.length; i++)
    for (let j = i + 1; j < out.length; j++) {
      const a = cover(out[i]);
      for (const m of cover(out[j]))
        if (a.has(m)) return `Shifts ${out[i].code} and ${out[j].code} overlap`;
    }
  return out.sort((a, b) => SHIFT_CODES.indexOf(a.code) - SHIFT_CODES.indexOf(b.code));
}

export function cleanAllowedShifts(v: unknown): ShiftCode[] | null | string {
  if (v === null || v === undefined) return null;
  if (!Array.isArray(v)) return "Allowed shifts are not valid";
  const set = SHIFT_CODES.filter((c) => v.includes(c));
  if (!set.length) return "Allow at least one shift";
  return set.length === 3 ? null : set;
}
