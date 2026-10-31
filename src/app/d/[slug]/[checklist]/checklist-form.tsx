"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CalendarDays, CircleAlert, CircleCheck, Clock3, Lock, Sun, UserRound } from "lucide-react";
import { useNow } from "@/components/clock";
import { Icon } from "@/components/icon";
import { EASE, Rise } from "@/components/motion";
import { SignatureSheet } from "@/components/signature-sheet";
import { useStaff } from "@/components/staff";
import type { Checklist, Department, Field, FieldValue } from "@/lib/types";
import { cx, isOutOfRange, rangeLabel, zoned } from "@/lib/utils";

type Data = { checklist: Checklist; department: Department };

export function ChecklistForm() {
  const { slug, checklist: id } = useParams<{ slug: string; checklist: string }>();
  const router = useRouter();
  const { staff, ready } = useStaff();
  const now = useNow();
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [signing, setSigning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState<{ at: string; flagged: boolean } | null>(null);

  useEffect(() => {
    fetch(`/api/public/checklists/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setMissing(true));
  }, [id]);

  useEffect(() => {
    if (ready && !staff) router.replace(`/d/${slug}`);
  }, [ready, staff, router, slug]);

  const set = (k: string, v: FieldValue) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: false }));
  };

  function review(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    const bad: Record<string, boolean> = {};
    for (const f of data.checklist.fields) {
      const v = values[f.key];
      if (f.required && (v === undefined || v === null || v === "")) bad[f.key] = true;
      if (f.type === "number" && v !== undefined && v !== null && v !== "" && Number.isNaN(Number(v))) bad[f.key] = true;
    }
    setErrors(bad);
    setServerError("");
    if (Object.keys(bad).length) {
      document.getElementById(`f-${Object.keys(bad)[0]}`)?.focus();
      return;
    }
    setSigning(true);
  }

  const closeSheet = useCallback(() => setSigning(false), []);

  async function submit(signature: string) {
    if (!data || !staff) return;
    setBusy(true);
    setServerError("");
    try {
      const r = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          checklist_id: data.checklist.id,
          employee_name: staff.name,
          employee_no: staff.no,
          values,
          signature,
          note,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not submit");
      setSigning(false);
      setDone({ at: j.submitted_at, flagged: j.flagged });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not submit");
      setSigning(false);
    } finally {
      setBusy(false);
    }
  }

  if (missing)
    return (
      <main className="mx-auto grid w-full max-w-md flex-1 place-items-center px-4">
        <div className="glass p-8 text-center">
          <p className="text-lg font-semibold">This checklist isn’t available</p>
          <Link href={`/d/${slug}`} className="btn btn-primary mt-5">
            Back to checklists
          </Link>
        </div>
      </main>
    );

  const z = now ? zoned(now) : null;
  const c = data?.checklist;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-6">
      <header className="flex items-center gap-3 py-4">
        <Link href={`/d/${slug}`} className="btn btn-ghost btn-sm btn-icon" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="truncate text-[14px] text-ink-3">{data?.department.name_en ?? ""}</p>
      </header>

      <Rise className="flex items-start gap-4 pb-6 pt-2">
        <span
          className="grid h-16 w-16 shrink-0 place-items-center rounded-[20px] text-white"
          style={
            c
              ? {
                  background: `linear-gradient(145deg, ${c.color}, color-mix(in oklab, ${c.color} 55%, #283a83))`,
                  boxShadow: `0 14px 26px -14px ${c.color}, inset 0 1px 0 rgba(255,255,255,.35)`,
                }
              : { background: "rgba(255,255,255,.6)" }
          }
        >
          {c && <Icon name={c.icon} className="h-8 w-8" />}
        </span>
        <div className="min-w-0">
          <h1 className="text-balance text-[24px] font-semibold leading-tight tracking-[-0.02em] sm:text-[28px]">
            {c?.title_en ?? <span className="inline-block h-8 w-72 max-w-full animate-pulse rounded-xl bg-white/[0.06]" />}
          </h1>
          {c?.title_ar && (
            <p className="mt-1 text-[15px] text-ink-2" dir="rtl">
              {c.title_ar}
            </p>
          )}
        </div>
      </Rise>

      <form onSubmit={review} noValidate className="flex flex-col gap-4">
        <Rise i={1} className="glass p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow">Recorded automatically</p>
            <span className="flex items-center gap-1 text-[12px] text-ink-3">
              <Lock className="h-3 w-3" /> Auto
            </span>
          </div>
          <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2 sm:gap-3">
            <AutoCell icon={<CalendarDays className="h-4 w-4" />} label="Date" ar="التاريخ" value={z?.date} />
            <AutoCell icon={<Sun className="h-4 w-4" />} label="Day" ar="اليوم" value={z ? <><span className="sm:hidden">{z.dayShort}</span><span className="hidden sm:inline">{z.day}</span></> : undefined} />
            <AutoCell icon={<Clock3 className="h-4 w-4" />} label="Time" ar="الوقت" value={z?.time} live />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-[14px]">
            <UserRound className="h-4 w-4 text-ink-3" />
            <span className="text-ink-3">Checked by</span>
            <span className="truncate font-semibold">{staff?.name ?? "—"}</span>
          </div>
        </Rise>

        <Rise i={2} className="glass flex flex-col gap-5 p-4 sm:p-5">
          <p className="eyebrow">Readings</p>
          {c?.fields.map((f) => (
            <FieldInput key={f.key} f={f} value={values[f.key]} error={errors[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
          {!c && <div className="h-24 animate-pulse rounded-xl bg-white/[0.06]" />}
          <div>
            <label htmlFor="note" className="label">
              Note <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <textarea
              id="note"
              rows={2}
              className="field resize-none"
              placeholder="Anything to report?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {c?.range_note && <p className="text-[12px] leading-relaxed text-ink-3">{c.range_note}</p>}
        </Rise>

        <AnimatePresence>
          {serverError && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-danger/10 px-4 py-3 text-[14px] text-danger"
              role="alert"
            >
              {serverError}
            </motion.p>
          )}
        </AnimatePresence>

        <Rise i={3} className="sticky bottom-[max(12px,env(safe-area-inset-bottom))] z-10">
          <button className="btn btn-primary h-14 w-full text-[16px]" disabled={!c}>
            Submit & sign
          </button>
        </Rise>
      </form>

      <SignatureSheet open={signing} busy={busy} name={staff?.name ?? ""} onClose={closeSheet} onConfirm={submit} />
      <Success done={done} checklist={c} values={values} slug={slug} />
    </main>
  );
}

function AutoCell({ icon, label, ar, value, live }: { icon: React.ReactNode; label: string; ar: string; value?: React.ReactNode; live?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/[0.06] px-2.5 py-2.5 sm:px-3">
      <div className="flex items-center gap-1.5 text-ink-3">
        {icon}
        <span className="truncate text-[11px] font-medium">
          {label}
          <span className="hidden sm:inline"> · {ar}</span>
        </span>
      </div>
      <p className="mt-1 whitespace-nowrap text-[15px] font-semibold tabular-nums sm:text-[16px]">
        {value ?? "—"}
        {live && <span className="pulse-dot ml-2 align-middle" aria-hidden />}
      </p>
    </div>
  );
}

function FieldInput({ f, value, error, onChange }: { f: Field; value: FieldValue | undefined; error?: boolean; onChange: (v: FieldValue) => void }) {
  const id = `f-${f.key}`;
  const out = isOutOfRange(f, value ?? null);
  const has = value !== undefined && value !== null && value !== "";
  const range = rangeLabel(f);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="label">
          {f.label_en}
          {f.label_ar && <span className="font-normal text-ink-3"> · {f.label_ar}</span>}
          {f.required && <span className="text-danger"> *</span>}
        </label>
        {range && <span className="num text-[12px] text-ink-3">Normal {range}</span>}
      </div>

      {f.type === "number" && (
        <div className="relative">
          <input
            id={id}
            className={cx("field num pr-14 text-[20px] font-semibold", error && "border-danger/60")}
            inputMode="decimal"
            step="any"
            type="number"
            placeholder="0.0"
            value={(value as string | number | undefined) ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? "" : e.target.value)}
            aria-invalid={error || undefined}
          />
          {f.unit && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-ink-3">{f.unit}</span>}
        </div>
      )}
      {f.type === "text" && (
        <input id={id} className={cx("field", error && "border-danger/60")} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
      {f.type === "select" && (
        <select id={id} className={cx("field", error && "border-danger/60")} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {f.options?.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      )}
      {f.type === "yesno" && (
        <div id={id} tabIndex={-1} className="grid grid-cols-2 gap-2" role="radiogroup">
          {[
            { v: true, l: "Yes · نعم" },
            { v: false, l: "No · لا" },
          ].map((o) => (
            <button
              type="button"
              key={String(o.v)}
              role="radio"
              aria-checked={value === o.v}
              onClick={() => onChange(o.v)}
              className={cx(
                "btn h-[52px] border",
                value === o.v
                  ? o.v
                    ? "border-green/40 bg-green/12 text-green"
                    : "border-danger/40 bg-danger/10 text-danger"
                  : "border-ink/10 bg-white/[0.06] text-ink-2",
              )}
            >
              {o.l}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <Msg key="err" tone="danger" text={`${f.label_en} is required`} />
        ) : f.type === "number" && has && range ? (
          out ? (
            <Msg key="out" tone="warn" text={`Outside the normal range (${range}). It will be flagged for review.`} />
          ) : (
            <Msg key="ok" tone="ok" text="Within normal range" />
          )
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Msg({ tone, text }: { tone: "ok" | "warn" | "danger"; text: string }) {
  const Ico = tone === "ok" ? CircleCheck : CircleAlert;
  return (
    <motion.p
      initial={{ opacity: 0, height: 0, y: -4 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={cx(
        "flex items-center gap-1.5 overflow-hidden pt-2 text-[13px] font-medium",
        tone === "ok" && "text-green",
        tone === "warn" && "text-warn",
        tone === "danger" && "text-danger",
      )}
    >
      <Ico className="h-3.5 w-3.5 shrink-0" /> {text}
    </motion.p>
  );
}

function Success({
  done,
  checklist,
  values,
  slug,
}: {
  done: { at: string; flagged: boolean } | null;
  checklist?: Checklist;
  values: Record<string, FieldValue>;
  slug: string;
}) {
  const z = done ? zoned(done.at) : null;
  return (
    <AnimatePresence>
      {done && checklist && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(4,24,32,.6)] p-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          role="status"
          aria-live="polite"
        >
          <motion.div
            className="glass-strong w-full max-w-sm p-7 text-center"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
          >
            <div className="relative mx-auto h-24 w-24">
              <motion.span
                className="absolute inset-0 rounded-full bg-green/15"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: [0.4, 1.35, 1], opacity: [0, 0.8, 1] }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
              />
              <svg viewBox="0 0 96 96" className="relative h-24 w-24" aria-hidden>
                <motion.circle
                  cx="48"
                  cy="48"
                  r="34"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, rotate: -90 }}
                  animate={{ pathLength: 1 }}
                  style={{ originX: "50%", originY: "50%" }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
                />
                <motion.path
                  d="M33 49.5 L43.5 60 L64 38"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: EASE, delay: 0.75 }}
                />
              </svg>
            </div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.9 }}>
              <h2 className="mt-5 text-[26px] font-semibold tracking-tight">Successfully checked</h2>
              <p className="mt-1 text-[18px] font-medium text-ink-2" dir="rtl">
                تم التحقق بنجاح
              </p>
              <p className="num mt-4 text-[13px] text-ink-3">
                {z?.day} · {z?.date} · {z?.time}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {checklist.fields
                  .filter((f) => values[f.key] !== undefined && values[f.key] !== "")
                  .map((f) => (
                    <span
                      key={f.key}
                      className={cx(
                        "num rounded-full px-3 py-1 text-[13px] font-semibold",
                        isOutOfRange(f, values[f.key]) ? "bg-warn/15 text-warn" : "bg-white/[0.06] text-ink",
                      )}
                    >
                      {f.label_en}: {f.type === "yesno" ? (values[f.key] ? "Yes" : "No") : `${values[f.key]}${f.unit ?? ""}`}
                    </span>
                  ))}
              </div>
              {done.flagged && (
                <p className="mt-4 rounded-xl bg-warn/12 px-3 py-2 text-[13px] text-warn">
                  A reading was outside the normal range. Please inform the charge nurse.
                </p>
              )}
              <Link href={`/d/${slug}`} className="btn btn-primary mt-6 w-full">
                Back to checklists
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
