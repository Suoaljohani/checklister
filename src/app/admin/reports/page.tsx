"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { FileSpreadsheet, FileText, FileType2, LoaderCircle } from "lucide-react";
import { PAGE, ReportPage, reportPages, type ReportInput } from "@/components/paper-form";
import { EASE } from "@/components/motion";
import type { Checklist, Department, Settings, Submission } from "@/lib/types";
import { currentMonth, monthRange } from "@/lib/utils";
import { useToast } from "../admin-shell";
import { PageTitle, useData } from "../use-data";

export default function ReportsPage() {
  const toast = useToast();
  const { data: checklists } = useData<Checklist[]>("/api/admin/checklists");
  const { data: deps } = useData<Department[]>("/api/admin/departments");
  const { data: settings } = useData<Settings>("/api/admin/settings");
  const [picked, setChkId] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [busy, setBusy] = useState<"" | "pdf" | "xlsx" | "docx">("");
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);


  const chkId = picked || checklists?.[0]?.id || "";
  const range = monthRange(month || currentMonth());
  const { data: subs } = useData<Submission[]>(
    chkId ? `/api/admin/submissions?signatures=1&checklist=${chkId}&from=${range.from}&to=${range.to}` : null,
  );

  const checklist = checklists?.find((c) => c.id === chkId);
  const input: ReportInput | null = useMemo(
    () =>
      checklist && settings && subs
        ? {
            checklist,
            department: deps?.find((d) => d.id === checklist.department_id),
            settings,
            month,
            rows: [...subs].sort((a, b) => (a.submitted_at < b.submitted_at ? -1 : 1)),
          }
        : null,
    [checklist, settings, subs, deps, month],
  );
  const P = checklist ? PAGE[checklist.orientation] : PAGE.portrait;
  const pages = useMemo(() => (input ? reportPages(input) : []), [input]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / P.w)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [P.w]);

  async function run(kind: "pdf" | "xlsx" | "docx") {
    if (!input) return;
    setBusy(kind);
    try {
      const ex = await import("@/lib/exporters");
      if (kind === "pdf") await ex.exportPdf(input, pageRefs.current.slice(0, pages.length).filter(Boolean) as HTMLElement[]);
      if (kind === "xlsx") await ex.exportExcel(input);
      if (kind === "docx") await ex.exportWord(input);
      toast(`${kind === "pdf" ? "PDF" : kind === "xlsx" ? "Excel" : "Word"} file downloaded`);
    } catch (e) {
      console.error(e);
      toast("Export failed. Please try again.", "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <PageTitle title="Export" sub="Download a month of records as PDF (paper form), Excel or Word" />

      <div className="glass mb-4 grid gap-3 p-4 lg:grid-cols-[1fr_200px_auto] lg:items-end">
        <div>
          <label className="label">Checklist</label>
          <select className="field sm" value={chkId} onChange={(e) => setChkId(e.target.value)}>
            {checklists?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title_en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Month</label>
          <input type="month" className="field sm" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ExportBtn onClick={() => run("pdf")} busy={busy === "pdf"} disabled={!input || !!busy} icon={<FileText className="h-4 w-4" />} label="PDF" tint="#E0475B" />
          <ExportBtn onClick={() => run("xlsx")} busy={busy === "xlsx"} disabled={!input || !!busy} icon={<FileSpreadsheet className="h-4 w-4" />} label="Excel" tint="#04A67A" />
          <ExportBtn onClick={() => run("docx")} busy={busy === "docx"} disabled={!input || !!busy} icon={<FileType2 className="h-4 w-4" />} label="Word" tint="#1691D0" />
        </div>
      </div>

      <p className="mb-3 px-1 text-[13px] text-ink-3">
        {input ? `${input.rows.length} record${input.rows.length === 1 ? "" : "s"} · ${pages.length} page${pages.length === 1 ? "" : "s"} · preview of the PDF` : "Loading…"}
      </p>

      <div ref={wrapRef} className="flex flex-col items-center gap-5">
        {input &&
          pages.map((page, i) => (
            <motion.div
              key={`${chkId}-${month}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
              className="overflow-hidden rounded-md shadow-[0_30px_70px_-24px_rgba(0,0,0,.7)]"
              style={{ width: P.w * scale, height: P.h * scale }}
            >
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: P.w, height: P.h }}>
                <ReportPage
                  ref={(el) => {
                    pageRefs.current[i] = el;
                  }}
                  {...input}
                  page={page}
                  index={i}
                  total={pages.length}
                />
              </div>
            </motion.div>
          ))}
      </div>
    </div>
  );
}

function ExportBtn({ onClick, busy, disabled, icon, label, tint }: { onClick: () => void; busy: boolean; disabled: boolean; icon: React.ReactNode; label: string; tint: string }) {
  return (
    <button onClick={onClick} disabled={disabled} className="btn btn-ghost h-[42px] px-3" style={{ color: tint }}>
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : icon}
      <span className="text-ink">{label}</span>
    </button>
  );
}
