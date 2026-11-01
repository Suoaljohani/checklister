/* eslint-disable @next/next/no-img-element */
import { forwardRef } from "react";
import type { Checklist, Department, Settings, Submission } from "@/lib/types";
import { formatValue, isOutOfRange, zoned } from "@/lib/utils";

export const PAGE = {
  portrait: { w: 794, h: 1123, rows: 31, rowH: 23 },
  landscape: { w: 1123, h: 794, rows: 17, rowH: 25 },
};

export type ReportInput = {
  checklist: Checklist;
  department: Department | undefined;
  settings: Pick<Settings, "header_en" | "header_ar">;
  month: string; // YYYY-MM
  rows: Submission[]; // oldest first
};

export function paginate(rows: Submission[], per: number) {
  const pages: (Submission | null)[][] = [];
  for (let i = 0; i < Math.max(rows.length, 1); i += per) {
    const chunk: (Submission | null)[] = rows.slice(i, i + per);
    while (chunk.length < per) chunk.push(null);
    pages.push(chunk);
  }
  return pages;
}

const serif = `"Times New Roman", Tinos, "Liberation Serif", "Noto Serif", Georgia, serif`;
const arabic = `"IBM Plex Sans Arabic", "Noto Naskh Arabic", "Geeza Pro", Tahoma, serif`;

export const PaperPage = forwardRef<
  HTMLDivElement,
  ReportInput & { pageRows: (Submission | null)[]; index: number; total: number }
>(function PaperPage({ checklist: c, department, settings, month, pageRows, index, total }, ref) {
  const P = PAGE[c.orientation];
  const landscape = c.orientation === "landscape";
  const [y, m] = month.split("-");
  const border = "1px solid #222";
  const th: React.CSSProperties = { border, padding: "4px 6px", fontWeight: 700, fontSize: 13, textAlign: "center", lineHeight: 1.15 };
  const td: React.CSSProperties = { border, padding: "0 6px", height: P.rowH, fontSize: 13, textAlign: "center", fontFamily: serif };

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
        <div style={{ textAlign: "center", fontSize: 14.5, lineHeight: 1.35, fontWeight: 600, color: "#333" }}>
          {settings.header_en.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img src="/brand/logo.svg" alt="" style={{ width: landscape ? 92 : 108, height: "auto" }} />
        </div>
        <div style={{ textAlign: "center", fontSize: 14.5, lineHeight: 1.5, direction: "rtl", fontFamily: arabic, color: "#333" }}>
          {settings.header_ar.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginTop: landscape ? 14 : 30 }}>
        <div style={{ fontSize: landscape ? 18 : 18.5, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>{c.title_en}</div>
        {c.title_ar && (
          <div style={{ fontSize: 14, marginTop: 3, direction: "rtl", fontFamily: arabic, color: "#333" }}>{c.title_ar}</div>
        )}
      </div>

      <div style={{ marginTop: landscape ? 10 : 18, fontSize: 15, fontWeight: 700, lineHeight: 1.55, paddingLeft: landscape ? 0 : 70 }}>
        <div>
          DEPARTMENT: <span style={{ fontWeight: 400, borderBottom: "1px dotted #555", padding: "0 18px 0 6px" }}>{department?.name_en ?? ""}</span>
          {department?.name_ar && <span style={{ fontFamily: arabic, fontWeight: 400, fontSize: 13, marginLeft: 8, color: "#555" }}>القسم</span>}
        </div>
        <div>
          MONTH: <span style={{ fontWeight: 400, borderBottom: "1px dotted #555", padding: "0 18px 0 6px" }}>{`${m}/${y}`}</span>
          <span style={{ fontFamily: arabic, fontWeight: 400, fontSize: 13, marginLeft: 8, color: "#555" }}>الشهر</span>
        </div>
      </div>

      {/* Table */}
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
            {c.fields.map((f) => (
              <th key={f.key} style={th}>
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
                  {c.fields.map((f) => (
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
                {c.fields.map((f) => (
                  <td key={f.key} style={{ ...td, color: isOutOfRange(f, r.values[f.key]) ? "#b4232f" : undefined, fontWeight: isOutOfRange(f, r.values[f.key]) ? 700 : 400 }}>
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

      {c.range_note && (
        <div style={{ textAlign: "center", fontSize: 11.5, marginTop: 8, color: "#444", letterSpacing: 0.2 }}>{c.range_note}</div>
      )}

      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 11, color: "#888" }}>
        <span>{c.footer_note}</span>
        <span>
          Page {index + 1} of {total}
        </span>
      </div>
    </div>
  );
});
