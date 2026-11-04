"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "motion/react";
import { ArrowLeft, Check, LoaderCircle, Lock, LogOut, Pencil, Signature, UserRound } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { LiveClock, useNow } from "@/components/clock";
import { Icon } from "@/components/icon";
import { EASE, Rise } from "@/components/motion";
import { clearSavedSignature, getSavedSignature, greeting, useStaff } from "@/components/staff";
import { LAST_DEPT, StaffNav } from "@/components/staff-nav";
import type { Checklist, Department } from "@/lib/types";

type Data = { department: Department; checklists: Checklist[]; doneToday: Record<string, number> };

export function DepartmentView() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);
  const { staff, setStaff, ready, mode, signIn, signOut } = useStaff();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [no, setNo] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const shake = useAnimationControls();
  const now = useNow(60_000);
  const [hasSig, setHasSig] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser storage after mount
    setHasSig(staff ? !!getSavedSignature(staff.name) : false);
  }, [staff]);

  useEffect(() => {
    fetch(`/api/public/departments/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setMissing(true));
    try {
      localStorage.setItem(LAST_DEPT, slug);
    } catch {}
  }, [slug]);

  const showForm = ready && (!staff || editing);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (mode === "accounts") {
      if (!no.trim() || !password) return nudge();
      setBusy(true);
      setErr("");
      try {
        await signIn(no.trim(), password);
        clearSavedSignature();
        setPassword("");
      } catch (x) {
        setErr((x as Error).message);
        nudge();
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!name.trim()) {
      nudge();
      return;
    }
    if (staff && staff.name.trim().toLowerCase() !== name.trim().toLowerCase()) clearSavedSignature();
    setStaff({ name: name.trim(), no: no.trim() });
    setEditing(false);
  }

  function nudge() {
    shake.start({ x: [0, -8, 7, -5, 3, 0], transition: { duration: 0.45 } });
    nameRef.current?.focus();
  }

  function open(c: Checklist) {
    if (!staff) return nudge();
    router.push(`/d/${slug}/${c.id}`);
  }

  if (missing)
    return (
      <main className="mx-auto grid w-full max-w-md flex-1 place-items-center px-4">
        <div className="glass p-8 text-center">
          <p className="text-lg font-semibold">Department not found</p>
          <Link href="/" className="btn btn-primary mt-5">
            Back to departments
          </Link>
        </div>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))] sm:px-6 sm:pb-6">
      <header className="flex items-center justify-between gap-3 py-4">
        <Link href="/" className="btn btn-ghost btn-sm btn-icon" aria-label="Back to departments">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="hidden sm:block">
          <Wordmark compact />
        </div>
        <LiveClock className="glass rounded-full px-3 py-1.5" />
      </header>

      <section className="pb-8 pt-6">
        <Rise>
          <p className="text-[16px] font-medium text-sky" dir="rtl">{data?.department.name_ar ?? " "}</p>
          <h1 className="mt-1 text-[34px] font-bold leading-tight tracking-[-0.03em] sm:text-[46px]">
            {data?.department.name_en ?? <span className="inline-block h-10 w-64 animate-pulse rounded-xl bg-white/[0.06]" />}
          </h1>
        </Rise>

        <Rise i={1} className="mt-6">
          {showForm ? (
            mode === "accounts" ? (
            <motion.form animate={shake} onSubmit={save} className="glass flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label htmlFor="no" className="label">
                    Employee no. · الرقم الوظيفي
                  </label>
                  <input
                    id="no"
                    ref={nameRef}
                    className="field num"
                    inputMode="numeric"
                    autoComplete="username"
                    value={no}
                    onChange={(e) => setNo(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="pw" className="label">
                    Password · كلمة المرور
                  </label>
                  <input
                    id="pw"
                    type="password"
                    className="field"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary h-[52px]" disabled={busy}>
                  {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Sign in
                </button>
              </div>
              {err && (
                <p className="text-[13px] text-danger" role="alert">
                  {err}
                </p>
              )}
            </motion.form>
            ) : (
            <motion.form animate={shake} onSubmit={save} className="glass flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5">
              <div className="flex-1">
                <label htmlFor="name" className="label">
                  Your name · الاسم
                </label>
                <input
                  id="name"
                  ref={nameRef}
                  className="field"
                  autoComplete="name"
                  placeholder="e.g. Sara Alanazi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="sm:w-48">
                <label htmlFor="no" className="label">
                  Employee no. <span className="font-normal text-ink-3">(optional)</span>
                </label>
                <input id="no" className="field" inputMode="numeric" placeholder="—" value={no} onChange={(e) => setNo(e.target.value)} />
              </div>
              <button className="btn btn-primary h-[52px]">Continue</button>
            </motion.form>
            )
          ) : staff ? (
            <div className="glass flex items-center gap-4 p-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal to-blue text-white">
                <UserRound className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink-3">{now ? greeting(now) : "Welcome"},</p>
                <p className="truncate text-[18px] font-semibold">{staff.name}</p>
                {hasSig && (
                  <button
                    className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-3 underline-offset-2 hover:underline"
                    onClick={() => {
                      if (!confirm("Remove your saved signature from this phone?")) return;
                      clearSavedSignature();
                      setHasSig(false);
                    }}
                  >
                    <Signature className="h-3.5 w-3.5" /> Signature saved · Remove
                  </button>
                )}
              </div>
              {mode === "accounts" ? (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    clearSavedSignature();
                    setHasSig(false);
                    setNo("");
                    await signOut();
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              ) : (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setName(staff.name);
                    setNo(staff.no);
                    setEditing(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Not you?
                </button>
              )}
            </div>
          ) : (
            <div className="glass h-[84px] animate-pulse opacity-60" />
          )}
        </Rise>
      </section>

      <section aria-labelledby="lists">
        <Rise i={2}>
          <h2 id="lists" className="eyebrow mb-4 px-1">
            Select a checklist
          </h2>
        </Rise>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {!data &&
            [0, 1, 2].map((i) => <div key={i} className="glass aspect-[4/5] animate-pulse opacity-60 sm:aspect-square" />)}
          {data?.checklists.map((c, i) => {
            const done = (data.doneToday[c.id] ?? 0) > 0;
            return (
              <Rise key={c.id} i={3 + i}>
                <button
                  onClick={() => open(c)}
                  className="glass glass-hover sheen focus-ring group flex aspect-[4/5] w-full flex-col justify-between p-4 text-left sm:aspect-square sm:p-5"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className="grid h-14 w-14 place-items-center rounded-[18px] text-white transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06] group-hover:-rotate-3"
                      style={{
                        background: `linear-gradient(145deg, ${c.color}, color-mix(in oklab, ${c.color} 55%, #283a83))`,
                        boxShadow: `0 14px 26px -14px ${c.color}, inset 0 1px 0 rgba(255,255,255,.35)`,
                      }}
                    >
                      <Icon name={c.icon} className="h-7 w-7" />
                    </span>
                    {c.locked && !done && (
                      <span className="flex items-center gap-1 rounded-full bg-white/[0.08] px-2 py-1 text-[11px] font-semibold text-ink-2" title="Needs a code">
                        <Lock className="h-3 w-3" strokeWidth={2.6} /> Code
                      </span>
                    )}
                    {done && (
                      <motion.span
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: EASE, delay: 0.4 }}
                        className="flex items-center gap-1 rounded-full bg-green/12 px-2 py-1 text-[11px] font-semibold text-green"
                        title="Checked today"
                      >
                        <Check className="h-3 w-3" strokeWidth={3} /> Today
                      </motion.span>
                    )}
                  </div>
                  <div>
                    <p className="line-clamp-3 text-[15px] font-semibold leading-snug tracking-tight sm:text-[16px]">{c.title_en}</p>
                    {c.title_ar && (
                      <p className="mt-1 line-clamp-2 text-[13px] text-ink-3" dir="rtl">
                        {c.title_ar}
                      </p>
                    )}
                  </div>
                </button>
              </Rise>
            );
          })}
        </div>
        {data?.checklists.length === 0 && <p className="glass p-6 text-ink-2">No checklists in this department yet.</p>}
      </section>
      <StaffNav />
    </main>
  );
}
