/* eslint-disable @next/next/no-img-element */
import { forwardRef } from "react";
import type { Checklist, Department, Field, Settings, Submission } from "@/lib/types";
import { formatValue, isGrid, isOutOfRange, shiftOf, valueFields, zoned } from "@/lib/utils";

export const PAGE = {
  portrait: { w: 794, h: 1123, rows: 31, rowH: 23 },
  landscape: { w: 1123, h: 794, rows: 17, rowH: 25 },
};

/** Grid pages: entries per page across, item rows per page down. */
const GRID = {
  portrait: { cols: 10, rows: 37, rowH: 19, itemW: 210 },
  landscape: { cols: 16, rows: 20, rowH: 19, itemW: 250 },
};

export type ReportInput = {
  checklist: Checklist;
  department: Department | undefined;
  settings: Pick<Settings, "header_en" | "header_ar">;
  month: string; // YYYY-MM
  rows: Submission[]; // oldest first
};

export type Photo = { src: string; label: string; at: string; name: string };

export type ReportPageSpec =
  | { kind: "table"; rows: (Submission | null)[] }
  | { kind: "grid"; cols: (Submission | null)[]; fields: Field[] }
  | { kind: "photos"; photos: Photo[] };

export function paginate(rows: Submission[], per: number) {
  const pages: (Submission | null)[][] = [];
  for (let i = 0; i < Math.max(rows.length, 1); i += per) {
    const chunk: (Submission | null)[] = rows.slice(i, i + per);
    while (chunk.length < per) chunk.push(null);
    pages.push(chunk);
  }
  return pages;
}

function chunk<T>(list: T[], per: number) {
  const out: T[][] = [];
  for (let i = 0; i < Math.max(list.length, 1); i += per) out.push(list.slice(i, i + per));
  return out;
}

export function photosOf(r: ReportInput): Photo[] {
  const out: Photo[] = [];
  for (const s of r.rows)
    for (const f of r.checklist.fields) {
      const src = s.photos?.[f.key];
      if (src) out.push({ src, label: f.label_en, at: s.submitted_at, name: s.employee_name });
    }
  return out;
}

/** Every page of the report, in print order. */
export function reportPages(r: ReportInput): ReportPageSpec[] {
  const c = r.checklist;
  const pages: ReportPageSpec[] = [];
  if (isGrid(c)) {
    const G = GRID[c.orientation];
    for (const cols of chunk<Submission | null>(r.rows, G.cols)) {
      while (cols.length < G.cols) cols.push(null);
      for (const fields of chunk(c.fields, G.rows)) pages.push({ kind: "grid", cols, fields });
    }
  } else {
    for (const rows of paginate(r.rows, PAGE[c.orientation].rows)) pages.push({ kind: "table", rows });
  }
  const photos = photosOf(r);
  if (photos.length) for (const p of chunk(photos, 6)) pages.push({ kind: "photos", photos: p });
  return pages;
}

const serif = `"Times New Roman", Tinos, "Liberation Serif", "Noto Serif", Georgia, serif`;
const arabic = `"IBM Plex Sans Arabic", "Noto Naskh Arabic", "Geeza Pro", Tahoma, serif`;
const border = "1px solid #222";

type PageProps = ReportInput & { page: ReportPageSpec; index: number; total: number };

export const ReportPage = forwardRef<HTMLDivElement, PageProps>(function ReportPage(props, ref) {
  const { page } = props;
  return (
    <Sheet ref={ref} {...props} compact={page.kind !== "table"}>
      {page.kind === "table" && <TableBody {...props} pageRows={page.rows} />}
      {page.kind === "grid" && <GridBody {...props} cols={page.cols} fields={page.fields} />}
      {page.kind === "photos" && <PhotosBody {...props} photos={page.photos} />}
    </Sheet>
  );
});

/** Kept for callers that render plain table pages. */
export const PaperPage = forwardRef<HTMLDivElement, ReportInput & { pageRows: (Submission | null)[]; index: number; total: number }>(function PaperPage(
  { pageRows, ...rest },
  ref,
) {
  return <ReportPage ref={ref} {...rest} page={{ kind: "table", rows: pageRows }} />;
});

/* ---------------- Page frame: letterhead, title, footer ---------------- */

const Sheet = forwardRef<HTMLDivElement, PageProps & { compact: boolean; children: React.ReactNode }>(function Sheet(
  { checklist: c, department, settings, month, index, total, compact, children },
  ref,
) {
  const P = PAGE[c.orientation];
  const landscape = c.orientation === "landscape";
  const tight = landscape || compact;
  const [y, m] = month.split("-");
  return (
    <div
      ref={ref}
      style={{
        width: P.w,
        height: P.h,
        background: "#fff",
        color: "#111",
        fontFamily: serif,
        padding: landscape ? "30px 46px 26px" : "40px 52px 30px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Letterhead */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 1fr", alignItems: "center" }}>
        <div style={{ textAlign: "center", fontSize: tight ? 13 : 14.5, lineHeight: 1.35, fontWeight: 600, color: "#333" }}>
          {settings.header_en.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img src="/brand/logo.svg" alt="" style={{ width: tight ? 84 : 108, height: "auto" }} />
        </div>
        <div style={{ textAlign: "center", fontSize: tight ? 13 : 14.5, lineHeight: 1.5, direction: "rtl", fontFamily: arabic, color: "#333" }}>
          {settings.header_ar.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginTop: tight ? 12 : 30 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>{c.title_en}</div>
        {c.title_ar && <div style={{ fontSize: 14, marginTop: 3, direction: "rtl", fontFamily: arabic, color: "#333" }}>{c.title_ar}</div>}
      </div>

      <div
        style={{
          marginTop: tight ? 8 : 18,
          fontSize: tight ? 13.5 : 15,
          fontWeight: 700,
          lineHeight: 1.55,
          paddingLeft: tight ? 0 : 70,
          display: tight ? "flex" : "block",
          gap: 28,
        }}
      >
        <div>
          DEPARTMENT: <span style={{ fontWeight: 400, borderBottom: "1px dotted #555", padding: "0 18px 0 6px" }}>{department?.name_en ?? ""}</span>
          {department?.name_ar && <span style={{ fontFamily: arabic, fontWeight: 400, fontSize: 13, marginLeft: 8, color: "#555" }}>القسم</span>}
        </div>
        <div>
          MONTH: <span style={{ fontWeight: 400, borderBottom: "1px dotted #555", padding: "0 18px 0 6px" }}>{`${m}/${y}`}</span>
          <span style={{ fontFamily: arabic, fontWeight: 400, fontSize: 13, marginLeft: 8, color: "#555" }}>الشهر</span>
        </div>
      </div>

      {children}

      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 11, color: "#888" }}>
        <span>{c.footer_note}</span>
        <span>
          Page {index + 1} of {total}
        </span>
      </div>
    </div>
  );
});

function RangeNote({ c }: { c: Checklist }) {
  if (!c.range_note) return null;
  return <div style={{ textAlign: "center", fontSize: 11, marginTop: 6, color: "#444", letterSpacing: 0.2 }}>{c.range_note}</div>;
}

/* ---------------- One row per entry ---------------- */

function TableBody({ checklist: c, pageRows }: PageProps & { pageRows: (Submission | null)[] }) {
  const P = PAGE[c.orientation];
  const fields = valueFields(c);
  const th: React.CSSProperties = { border, padding: "4px 6px", fontWeight: 700, fontSize: 13, textAlign: "center", lineHeight: 1.15 };
  const td: React.CSSProperties = { border, padding: "0 6px", height: P.rowH, fontSize: 13, textAlign: "center", fontFamily: serif };
  return (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "13%" }}>
              DATE
              <div style={{ fontFamily: arabic, fontWeight: 400, fontSize: 11 }}>التاريخ</div>
            </th>
            <th style={{ ...th, width: "10%" }}>
              DAY
              <div style={{ fontFamily: arabic, fontWeight: 400, fontSize: 11 }}>اليوم</div>
            </th>
            <th style={{ ...th, width: "10%" }}>
              TIME
              <div style={{ fontFamily: arabic, fontWeight: 400, fontSize: 11 }}>الوقت</div>
            </th>
            {fields.map((f) => (
              <th key={f.key} style={{ ...th, fontSize: f.label_en.length > 24 ? 11 : 13 }}>
                {f.label_en.toUpperCase()}
                {f.label_ar && <div style={{ fontFamily: arabic, fontWeight: 400, fontSize: 11 }}>{f.label_ar}</div>}
              </th>
            ))}
            <th style={{ ...th, width: "18%" }}>
              NAME
              <div style={{ fontFamily: arabic, fontWeight: 400, fontSize: 11 }}>الاسم</div>
            </th>
            <th style={{ ...th, width: "14%" }}>
              SIGNATURE
              <div style={{ fontFamily: arabic, fontWeight: 400, fontSize: 11 }}>التوقيع</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r, i) => {
            if (!r)
              return (
                <tr key={`e${i}`}>
                  <td style={td} />
                  <td style={td} />
                  <td style={td} />
                  {fields.map((f) => (
                    <td key={f.key} style={td} />
                  ))}
                  <td style={td} />
                  <td style={td} />
                </tr>
              );
            const z = zoned(r.submitted_at);
            return (
              <tr key={r.id}>
                <td style={td}>{z.date}</td>
                <td style={td}>{z.dayShort}</td>
                <td style={td}>{z.time}</td>
                {fields.map((f) => (
                  <td key={f.key} style={{ ...td, ...valueStyle(f, r) }}>
                    {formatValue(f, r.values[f.key])}
                  </td>
                ))}
                <td style={{ ...td, fontSize: 11, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.employee_name}</td>
                <td style={{ ...td, padding: "1px 4px" }}>
                  {r.signature && (
                    <img src={r.signature} alt="" style={{ display: "block", margin: "0 auto", maxHeight: P.rowH - 3, maxWidth: "100%", objectFit: "contain" }} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <RangeNote c={c} />
    </>
  );
}

function valueStyle(f: Field, r: Submission): React.CSSProperties {
  const v = r.values[f.key];
  const bad = isOutOfRange(f, v) || ((f.type === "check" || f.type === "yesno") && v === false);
  return bad ? { color: "#b4232f", fontWeight: 700 } : {};
}

/* ---------------- Items down the side, entries across (paper grid) ---------------- */

function GridBody({ checklist: c, cols, fields }: PageProps & { cols: (Submission | null)[]; fields: Field[] }) {
  const G = GRID[c.orientation];
  const hasQty = c.fields.some((f) => f.qty);
  const span = cols.length + 1 + (hasQty ? 1 : 0);
  const th: React.CSSProperties = { border, padding: "2px 3px", fontWeight: 700, fontSize: 10.5, textAlign: "center", lineHeight: 1.15 };
  const td: React.CSSProperties = { border, padding: "0 3px", height: G.rowH, fontSize: 11, textAlign: "center", lineHeight: 1.05 };
  const label: React.CSSProperties = { ...td, textAlign: "left", padding: "0 5px", fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  return (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: G.itemW }} />
          {hasQty && <col style={{ width: 52 }} />}
          {cols.map((_, i) => (
            <col key={i} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "left", padding: "2px 5px" }} rowSpan={2}>
              ITEM
              <span style={{ fontFamily: arabic, fontWeight: 400, fontSize: 10, marginLeft: 6 }}>الصنف</span>
            </th>
            {hasQty && (
              <th style={th} rowSpan={2}>
                QTY
              </th>
            )}
            {cols.map((s, i) => (
              <th key={i} style={th}>
                {s ? zoned(s.submitted_at).date.slice(0, 5) : " "}
              </th>
            ))}
          </tr>
          <tr>
            {cols.map((s, i) => (
              <th key={i} style={{ ...th, fontWeight: 400 }}>
                {s ? shiftOf(s.submitted_at) : " "}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((f) =>
            f.type === "heading" ? (
              <tr key={f.key}>
                <td colSpan={span} style={{ ...label, background: "#e8eef2", fontWeight: 700, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.3 }}>
                  {f.label_en}
                  {f.label_ar && <span style={{ fontFamily: arabic, fontWeight: 400, marginLeft: 10, textTransform: "none" }}>{f.label_ar}</span>}
                </td>
              </tr>
            ) : (
              <tr key={f.key}>
                <td style={label} title={f.label_en}>
                  {f.label_en}
                  {f.unit ? ` (${f.unit})` : ""}
                </td>
                {hasQty && <td style={{ ...td, fontSize: 9.5 }}>{f.qty ?? ""}</td>}
                {cols.map((s, i) => (
                  <td key={i} style={{ ...td, ...(s ? valueStyle(f, s) : {}), fontSize: f.type === "text" ? 8.5 : 11, overflow: "hidden", wordBreak: "break-all" }}>
                    {s ? (f.type === "number" ? String(s.values[f.key] ?? "") : formatValue(f, s.values[f.key])) : ""}
                  </td>
                ))}
              </tr>
            ),
          )}
          <tr>
            <td style={{ ...label, fontWeight: 700 }}>
              NAME <span style={{ fontFamily: arabic, fontWeight: 400 }}>الاسم</span>
            </td>
            {hasQty && <td style={td} />}
            {cols.map((s, i) => (
              <td key={i} style={{ ...td, height: 30, fontSize: 7.5, lineHeight: 1.1, overflow: "hidden", wordBreak: "break-word" }}>
                {s?.employee_name ?? ""}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ ...label, fontWeight: 700 }}>
              STAFF SIGNATURE <span style={{ fontFamily: arabic, fontWeight: 400 }}>التوقيع</span>
            </td>
            {hasQty && <td style={td} />}
            {cols.map((s, i) => (
              <td key={i} style={{ ...td, height: 30, padding: 1 }}>
                {s?.signature && <img src={s.signature} alt="" style={{ display: "block", margin: "0 auto", maxHeight: 27, maxWidth: "100%", objectFit: "contain" }} />}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "center", gap: 18, fontSize: 10, color: "#555", marginTop: 5 }}>
        <span>Shift: M = Morning · A = Afternoon · N = Night</span>
        {c.fields.some((f) => f.type === "check") && <span>✓ = available · ✗ = missing</span>}
      </div>
      <RangeNote c={c} />
    </>
  );
}

/* ---------------- Attached photos ---------------- */

function PhotosBody({ checklist: c, photos }: PageProps & { photos: Photo[] }) {
  const landscape = c.orientation === "landscape";
  return (
    <>
      <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>
        ATTACHED PHOTOS <span style={{ fontFamily: arabic, fontWeight: 400, marginLeft: 6 }}>الصور المرفقة</span>
      </div>
      <div
        style={{
          marginTop: 8,
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: landscape ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
          gridTemplateRows: landscape ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
          gap: 12,
          paddingBottom: 12,
        }}
      >
        {photos.map((p, i) => {
          const z = zoned(p.at);
          return (
            <figure key={i} style={{ margin: 0, border, padding: 6, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f4f4" }}>
                <img src={p.src} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
              <figcaption style={{ fontSize: 10.5, marginTop: 5, lineHeight: 1.3 }}>
                <b>{p.label}</b>
                <br />
                {z.date} · {z.dayShort} · {z.time} · Shift {shiftOf(p.at)} · {p.name}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </>
  );
}
