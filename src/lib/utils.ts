import type { Checklist, Field, FieldValue } from "./types";

export const TZ = "Asia/Riyadh";

export function uid(prefix = "") {
  const r =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}-${r}` : r;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** Pieces of a date as seen in the hospital time zone. */
export function zoned(iso: string | Date, tz = TZ) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const get = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...o }).format(d);
  return {
    date: get({ day: "2-digit", month: "2-digit", year: "numeric" }),
    dayKey: new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d),
    day: get({ weekday: "long" }),
    dayShort: get({ weekday: "short" }),
    dayAr: new Intl.DateTimeFormat("ar-SA", { timeZone: tz, weekday: "long" }).format(d),
    time: new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(d),
    monthLabel: get({ month: "long", year: "numeric" }),
    monthShort: get({ month: "2-digit", year: "numeric" }),
  };
}

/** UTC ISO bounds of a calendar month (YYYY-MM) in the hospital time zone (UTC+3, no DST). */
export function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1, -3));
  const to = new Date(Date.UTC(y, m, 1, -3));
  return { from: from.toISOString(), to: to.toISOString(), days: new Date(Date.UTC(y, m, 0)).getUTCDate() };
}

export function currentMonth() {
  return zoned(new Date()).dayKey.slice(0, 7);
}

export function isOutOfRange(f: Field, v: FieldValue) {
  if (f.type !== "number" || v === null || v === "" || v === undefined) return false;
  const n = Number(v);
  if (Number.isNaN(n)) return false;
  return (f.min != null && n < f.min) || (f.max != null && n > f.max);
}

export function isFlagged(c: Checklist, values: Record<string, FieldValue>) {
  return c.fields.some((f) => isOutOfRange(f, values[f.key]) || (f.type === "yesno" && values[f.key] === false));
}

export function formatValue(f: Field, v: FieldValue) {
  if (v === null || v === undefined || v === "") return "";
  if (f.type === "yesno") return v ? "Yes" : "No";
  if (f.type === "number") return `${v}${f.unit ? (f.unit === "%" ? "%" : ` ${f.unit}`) : ""}`;
  return String(v);
}

export function rangeLabel(f: Field) {
  if (f.type !== "number") return "";
  const u = f.unit ?? "";
  if (f.min != null && f.max != null) return `${f.min}–${f.max}${u}`;
  if (f.max != null) return `≤ ${f.max}${u}`;
  if (f.min != null) return `≥ ${f.min}${u}`;
  return "";
}
