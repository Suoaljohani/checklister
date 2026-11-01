"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Camera, CalendarDays, Check, CheckCheck, CircleAlert, CircleCheck, Clock3, Lock, RotateCcw, Sun, UserRound, X } from "lucide-react";
import { HospitalBadge } from "@/components/brand";
import { useNow } from "@/components/clock";
import { Icon } from "@/components/icon";
import { EASE, Rise } from "@/components/motion";
import { SignatureSheet } from "@/components/signature-sheet";
import { useStaff } from "@/components/staff";
import type { Checklist, Department, Field, FieldValue } from "@/lib/types";
import { cx, isOutOfRange, rangeLabel, shiftOf, zoned } from "@/lib/utils";

type Data = { checklist: Checklist; department: Department };

export function ChecklistForm() {
  const { slug, checklist: id } = useParams<{ slug: string; checklist: string }>();
  const router = useRouter();
  const { staff, ready } = useStaff();
  const now = useNow(5_000);
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<Record<string, string>>({});
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
    if (v !== true)
      setPhotos((p) => {
        if (!(k in p)) return p;
        const next = { ...p };
        delete next[k];
        return next;
      });
  };
  const setPhoto = (k: string, png: string) => {
    setPhotos((p) => ({ ...p, [k]: png }));
    setErrors((e) => ({ ...e, [k]: false }));
  };

  const checks = data?.checklist.fields.filter((f) => f.type === "check") ?? [];
  const checkedCount = checks.filter((f) => values[f.key] !== undefined && values[f.key] !== null).length;
  function markAllOk() {
    const next: Record<string, FieldValue> = {};
    for (const f of checks) if (!f.photo && (values[f.key] === undefined || values[f.key] === null)) next[f.key] = true;
    setValues((s) => ({ ...s, ...next }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in next))));
  }

  function review(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    const bad: Record<string, boolean> = {};
    for (const f of data.checklist.fields) {
      if (f.type === "heading") continue;
      const v = values[f.key];
      if (f.required && (v === undefined || v === null || v === "")) bad[f.key] = true;
      if (f.photo && v === true && !photos[f.key]) bad[f.key] = true;
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
          photos,
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
        <p className="min-w-0 flex-1 truncate text-[14px] text-ink-3">{data?.department.name_en ?? ""}</p>
        <HospitalBadge size={34} />
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
            {now && (
              <span className="ml-auto shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[12px] font-semibold text-ink-2">
                Shift {shiftOf(now)}
              </span>
            )}
          </div>
        </Rise>

        <Rise i={2} className="glass flex flex-col gap-5 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">{checks.length ? "Items" : "Readings"}</p>
            {checks.length >= 3 && (
              <div className="flex items-center gap-2">
                <span className="num text-[12px] text-ink-3">
                  {checkedCount}/{checks.length}
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={markAllOk} disabled={checkedCount === checks.length}>
                  <CheckCheck className="h-4 w-4" /> Mark all OK
                </button>
              </div>
            )}
          </div>
          {c && groupFields(c.fields).map((g) =>
            g.checks ? (
              <div key={g.checks[0].key} className="-mt-2 flex flex-col gap-1.5">
                {g.checks.map((f) => (
                  <CheckRow
                    key={f.key}
                    f={f}
                    value={values[f.key]}
                    error={errors[f.key]}
                    photo={photos[f.key]}
                    onChange={(v) => set(f.key, v)}
                    onPhoto={(p) => setPhoto(f.key, p)}
                  />
                ))}
              </div>
            ) : g.field.type === "heading" ? (
              <div key={g.field.key} className="-mb-2 mt-1 flex items-baseline justify-between gap-2 border-b border-ink/10 pb-1.5">
                <p className="text-[14px] font-semibold text-sky">{g.field.label_en}</p>
                {g.field.label_ar && (
                  <p className="text-[13px] text-ink-3" dir="rtl">
                    {g.field.label_ar}
                  </p>
                )}
              </div>
            ) : (
              <FieldInput
                key={g.field.key}
                f={g.field}
                value={values[g.field.key]}
                error={errors[g.field.key]}
                photo={photos[g.field.key]}
                onChange={(v) => set(g.field.key, v)}
                onPhoto={(p) => setPhoto(g.field.key, p)}
              />
            ),
          )}
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

function groupFields(fields: Field[]) {
  const out: ({ checks: Field[]; field?: undefined } | { field: Field; checks?: undefined })[] = [];
  for (const f of fields) {
    const last = out[out.length - 1];
    if (f.type === "check") {
      if (last?.checks) last.checks.push(f);
      else out.push({ checks: [f] });
    } else out.push({ field: f });
  }
  return out;
}

/** Hidden camera input. Phones open the rear camera directly. */
function useCamera(onPhoto: (jpeg: string) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) onPhoto(await compress(file));
      }}
    />
  );
  return { open: () => ref.current?.click(), input };
}

async function compress(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    let q = 0.75;
    let out = c.toDataURL("image/jpeg", q);
    while (out.length > 850_000 && q > 0.3) out = c.toDataURL("image/jpeg", (q -= 0.15));
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function PhotoPreview({ src, onRetake }: { src?: string; onRetake: () => void }) {
  return (
    <AnimatePresence initial={false}>
      {src && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="overflow-hidden"
        >
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/[0.06] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Attached photo" className="h-16 w-16 rounded-lg object-cover" />
            <span className="flex-1 text-[13px] text-green">Photo attached</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRetake}>
              <RotateCcw className="h-3.5 w-3.5" /> Retake
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CheckRow({
  f,
  value,
  error,
  photo,
  onChange,
  onPhoto,
}: {
  f: Field;
  value: FieldValue | undefined;
  error?: boolean;
  photo?: string;
  onChange: (v: FieldValue) => void;
  onPhoto: (p: string) => void;
}) {
  const cam = useCamera(onPhoto);
  const needPhoto = f.photo && value === true && !photo;
  return (
    <div id={`f-${f.key}`} tabIndex={-1} className={cx("rounded-xl border px-3 py-2", error ? "border-danger/50 bg-danger/[0.06]" : "border-transparent bg-white/[0.05]")}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium leading-snug">
            {f.label_en}
            {f.photo && <Camera className="ml-1.5 inline h-3.5 w-3.5 text-ink-3" aria-label="Photo needed" />}
          </p>
          {(f.label_ar || f.qty) && (
            <p className="mt-0.5 text-[12px] text-ink-3">
              {f.qty && <span className="num">Qty {f.qty}</span>}
              {f.qty && f.label_ar && " · "}
              {f.label_ar}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5" role="radiogroup" aria-label={f.label_en}>
          <button
            type="button"
            role="radio"
            aria-checked={value === true}
            aria-label="OK"
            onClick={() => {
              onChange(true);
              if (f.photo && !photo) cam.open();
            }}
            className={cx("grid h-10 w-11 place-items-center rounded-xl border transition-colors", value === true ? "border-green/40 bg-green/15 text-green" : "border-ink/10 bg-white/[0.04] text-ink-3")}
          >
            {f.photo ? <Camera className="h-5 w-5" strokeWidth={2.2} /> : <Check className="h-5 w-5" strokeWidth={2.6} />}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={value === false}
            aria-label="Missing"
            onClick={() => onChange(false)}
            className={cx("grid h-10 w-11 place-items-center rounded-xl border transition-colors", value === false ? "border-danger/40 bg-danger/12 text-danger" : "border-ink/10 bg-white/[0.04] text-ink-3")}
          >
            <X className="h-5 w-5" strokeWidth={2.6} />
          </button>
        </div>
      </div>
      {cam.input}
      {needPhoto && (
        <button type="button" className="btn btn-primary btn-sm mt-2 w-full" onClick={cam.open}>
          <Camera className="h-4 w-4" /> Take photo
        </button>
      )}
      <PhotoPreview src={photo} onRetake={cam.open} />
    </div>
  );
}

function FieldInput({
  f,
  value,
  error,
  photo,
  onChange,
  onPhoto,
}: {
  f: Field;
  value: FieldValue | undefined;
  error?: boolean;
  photo?: string;
  onChange: (v: FieldValue) => void;
  onPhoto: (p: string) => void;
}) {
  const cam = useCamera(onPhoto);
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
              onClick={() => {
                onChange(o.v);
                if (o.v && f.photo && !photo) cam.open();
              }}
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

      {f.photo && (
        <>
          {cam.input}
          {value === true && !photo && (
            <button type="button" className="btn btn-primary btn-sm mt-2 w-full" onClick={cam.open}>
              <Camera className="h-4 w-4" /> Take photo
            </button>
          )}
          <PhotoPreview src={photo} onRetake={cam.open} />
        </>
      )}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <Msg key="err" tone="danger" text={f.photo && value === true && !photo ? "Please take a photo" : `${f.label_en} is required`} />
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
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(4,24,32,.75)] p-4"
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
                <CheckSummary checklist={checklist} values={values} />
                {checklist.fields
                  .filter((f) => f.type !== "check" && f.type !== "heading" && values[f.key] !== undefined && values[f.key] !== null && values[f.key] !== "")
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
                  A reading was outside the normal range or an item is missing. Please inform the charge nurse.
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

function CheckSummary({ checklist, values }: { checklist: Checklist; values: Record<string, FieldValue> }) {
  const checks = checklist.fields.filter((f) => f.type === "check");
  if (!checks.length) return null;
  const missing = checks.filter((f) => values[f.key] === false);
  return (
    <>
      <span className="num rounded-full bg-green/12 px-3 py-1 text-[13px] font-semibold text-green">
        {checks.length - missing.length}/{checks.length} OK
      </span>
      {missing.map((f) => (
        <span key={f.key} className="rounded-full bg-warn/15 px-3 py-1 text-[13px] font-semibold text-warn">
          Missing: {f.label_en}
        </span>
      ))}
    </>
  );
}
