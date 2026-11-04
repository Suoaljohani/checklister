"use client";

/* eslint-disable @next/next/no-img-element */
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Download, ExternalLink, FileText, LoaderCircle, RefreshCw } from "lucide-react";
import { HospitalBadge } from "@/components/brand";
import { Icon } from "@/components/icon";
import { ReportPage, reportPages, type ReportInput } from "@/components/paper-form";
import { currentMonth, zoned } from "@/lib/utils";

type Data = ReportInput & { generated_at: string };

/** Opened from a checklist's "latest report" QR code: the month's paper report, up to the moment of scanning. */
export function ReportView() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("t") ?? "";
  const month = sp.get("month") ?? "";
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [pngs, setPngs] = useState<string[]>([]);
  const [pdf, setPdf] = useState<{ url: string; name: string } | null>(null);
  const [nonce, setNonce] = useState(0);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    const q = new URLSearchParams({ t: token, ...(month ? { month } : {}) });
    fetch(`/api/public/report/${encodeURIComponent(id)}?${q}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Could not load the report");
        if (live) {
          setPngs([]);
          setPdf(null);
          setData(j);
        }
      })
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, [id, token, month, nonce]);

  const pages = useMemo(() => (data ? reportPages(data) : []), [data]);

  // Once the paper pages are in the DOM, snapshot them and build the PDF.
  useEffect(() => {
    if (!data || !pages.length) return;
    let live = true;
    (async () => {
      await document.fonts?.ready;
      const els = Array.from(holder.current?.children ?? []) as HTMLElement[];
      await Promise.all(Array.from(holder.current?.querySelectorAll("img") ?? []).map((i) => i.decode().catch(() => {})));
      const ex = await import("@/lib/exporters");
      const shots = await ex.pagesToPng(els, 2);
      if (!live) return;
      setPngs(shots);
      const blob = await ex.buildPdf(data, shots);
      if (live) setPdf({ url: URL.createObjectURL(blob), name: ex.pdfName(data) });
    })().catch(() => live && setError("Could not build the PDF"));
    return () => {
      live = false;
    };
  }, [data, pages]);

  useEffect(() => () => void (pdf && URL.revokeObjectURL(pdf.url)), [pdf]);

  const c = data?.checklist;
  const at = data ? zoned(data.generated_at) : null;
  const ym = data?.month ?? month ?? currentMonth();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-[max(16px,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-3 py-4">
        <p className="flex items-center gap-2 text-[14px] text-ink-2">
          <FileText className="h-4 w-4" /> Latest report · آخر تقرير
        </p>
        <HospitalBadge size={34} />
      </header>

      {error ? (
        <div className="glass mt-6 p-8 text-center">
          <p className="text-[17px] font-semibold">{error}</p>
          <p className="mt-1 text-[14px] text-ink-3" dir="rtl">
            تعذّر فتح التقرير. تأكد أن الرمز المطبوع حديث.
          </p>
        </div>
      ) : (
        <>
          <section className="glass flex items-start gap-4 p-4 sm:p-5">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] text-white"
              style={c ? { background: `linear-gradient(145deg, ${c.color}, color-mix(in oklab, ${c.color} 55%, #283a83))` } : { background: "rgba(255,255,255,.08)" }}
            >
              {c && <Icon name={c.icon} className="h-7 w-7" />}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-balance text-[20px] font-semibold leading-tight">{c?.title_en ?? <span className="inline-block h-6 w-56 animate-pulse rounded bg-white/[0.08]" />}</h1>
              {c?.title_ar && (
                <p className="mt-1 text-[14px] text-ink-2" dir="rtl">
                  {c.title_ar}
                </p>
              )}
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
                {data && <span>{data.department?.name_en}</span>}
                {data && (
                  <span>
                    {data.rows.length} record{data.rows.length === 1 ? "" : "s"}
                  </span>
                )}
                {at && (
                  <span className="num">
                    Updated {at.date} · {at.time}
                  </span>
                )}
              </p>
            </div>
          </section>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
            <a
              className={`btn btn-primary h-[52px] ${pdf ? "" : "pointer-events-none opacity-60"}`}
              href={pdf?.url}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!pdf}
            >
              {pdf ? <ExternalLink className="h-4 w-4" /> : <LoaderCircle className="h-4 w-4 animate-spin" />} {pdf ? "Open PDF" : "Preparing PDF…"}
            </a>
            <a className={`btn btn-ghost h-[52px] ${pdf ? "" : "pointer-events-none opacity-60"}`} href={pdf?.url} download={pdf?.name} aria-disabled={!pdf}>
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Download</span>
            </a>
            <label className="btn btn-ghost relative h-[52px] cursor-pointer" title="Change month">
              <CalendarDays className="h-4 w-4" />
              <span className="num">{ym}</span>
              <input
                type="month"
                className="absolute inset-0 opacity-0"
                value={ym}
                max={currentMonth()}
                onChange={(e) => e.target.value && router.replace(`/r/${encodeURIComponent(id)}?${new URLSearchParams({ t: token, month: e.target.value })}`)}
                aria-label="Month"
              />
            </label>
            <button className="btn btn-ghost h-[52px]" onClick={() => setNonce((n) => n + 1)} aria-label="Refresh" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Preview: the exact PDF pages */}
          <div className="mt-4 flex flex-col gap-3">
            {pngs.length
              ? pngs.map((src, i) => <img key={i} src={src} alt={`Page ${i + 1}`} className="w-full rounded-md bg-white shadow-[0_20px_50px_-24px_rgba(0,0,0,.7)]" />)
              : data && (
                  <div className="glass grid place-items-center p-12 text-ink-3">
                    <LoaderCircle className="h-7 w-7 animate-spin" />
                  </div>
                )}
          </div>
        </>
      )}

      {/* Full-size paper pages, off screen, used to make the PDF */}
      {data && (
        <div ref={holder} aria-hidden style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }}>
          {pages.map((page, i) => (
            <ReportPage key={i} {...data} page={page} index={i} total={pages.length} />
          ))}
        </div>
      )}
    </main>
  );
}
