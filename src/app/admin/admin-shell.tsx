"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  ClipboardList,
  FileDown,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  Lock,
  LogOut,
  Settings,
  TriangleAlert,
} from "lucide-react";
import { Wordmark } from "@/components/brand";
import { EASE } from "@/components/motion";
import { cx } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/records", label: "Records", icon: ClipboardList },
  { href: "/admin/reports", label: "Export", icon: FileDown },
  { href: "/admin/checklists", label: "Checklists", icon: ListChecks },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  const [backend, setBackend] = useState<string>("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const path = usePathname();

  const check = useCallback(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((j) => {
        setBackend(j.backend);
        setState(j.admin ? "in" : "out");
      })
      .catch(() => setState("out"));
  }, []);
  useEffect(check, [check]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setState("out");
  }

  if (state === "loading")
    return (
      <div className="grid flex-1 place-items-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-ink-3" />
      </div>
    );
  if (state === "out") return <Login onDone={check} />;

  return (
    <ToastCtx.Provider value={toast}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-5 px-3 pt-3 sm:px-5 sm:pt-5">
        <aside className="glass sticky top-5 hidden h-[calc(100dvh-40px)] w-60 shrink-0 flex-col p-4 lg:flex">
          <div className="px-1 pb-6 pt-1">
            <Wordmark compact />
            <p className="mt-2 pl-1 text-[12px] text-ink-3">Admin console · لوحة التحكم</p>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => {
              const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cx(
                    "focus-ring relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
                    active ? "text-ink" : "text-ink-2 hover:text-ink",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-[rgba(47,211,224,.16)] ring-1 ring-[rgba(124,233,240,.45)] shadow-[0_0_22px_-6px_rgba(47,211,224,.75)]"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <n.icon className="relative h-[18px] w-[18px]" strokeWidth={1.7} />
                  <span className="relative">{n.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            {backend === "file" && (
              <p className="flex gap-2 rounded-xl bg-warn/12 p-3 text-[12px] leading-snug text-warn">
                <TriangleAlert className="h-4 w-4 shrink-0" />
                Demo storage. Connect Supabase to keep data permanently.
              </p>
            )}
            <button onClick={logout} className="btn btn-ghost btn-sm w-full">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-6">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <Wordmark compact />
            <button onClick={logout} className="btn btn-ghost btn-sm btn-icon" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          {backend === "file" && (
            <p className="mb-4 flex gap-2 rounded-xl bg-warn/12 p-3 text-[12px] text-warn lg:hidden">
              <TriangleAlert className="h-4 w-4 shrink-0" /> Demo storage. Connect Supabase to keep data permanently.
            </p>
          )}
          {children}
        </div>

        {/* mobile tab bar */}
        <nav className="glass-strong fixed inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] z-40 flex justify-between p-1.5 lg:hidden">
          {NAV.map((n) => {
            const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cx("relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium", active ? "text-sky" : "text-ink-3")}
              >
                {active && (
                  <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-xl bg-[rgba(47,211,224,.16)] ring-1 ring-[rgba(124,233,240,.45)] shadow-[0_0_22px_-6px_rgba(47,211,224,.75)]" transition={{ type: "spring", stiffness: 420, damping: 36 }} />
                )}
                <n.icon className="relative h-5 w-5" strokeWidth={1.7} />
                <span className="relative">{n.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}
              transition={{ duration: 0.45, ease: EASE }}
              className={cx(
                "glass-strong rounded-full px-5 py-2.5 text-[14px] font-medium",
                t.tone === "error" ? "text-danger" : "text-ink",
              )}
              role="status"
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (r.ok) onDone();
    else setErr((await r.json().catch(() => ({}))).error || "Sign in failed");
  }

  return (
    <main className="grid flex-1 place-items-center px-4 py-16">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: EASE }}
        className="glass-strong w-full max-w-sm p-7"
      >
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[24px] bg-white/90 shadow-[0_0_30px_-6px_rgba(47,211,224,.7)]">
          <Image src="/brand/logo.svg" alt="Alhadithah General Hospital" width={60} height={60} priority />
        </div>
        <h1 className="mt-6 text-center text-[24px] font-semibold tracking-tight">
          checklist<span className="text-er">ER</span> admin
        </h1>
        <p className="mt-1 text-center text-[14px] text-ink-3">ER Checklists · لوحة التحكم</p>
        <label htmlFor="pw" className="label mt-7">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            id="pw"
            type="password"
            autoFocus
            autoComplete="current-password"
            className="field pl-11"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        </div>
        <AnimatePresence>
          {err && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="pt-2 text-[13px] text-danger" role="alert">
              {err}
            </motion.p>
          )}
        </AnimatePresence>
        <button className="btn btn-primary mt-5 w-full" disabled={busy || !pw}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Sign in
        </button>
        <Link href="/" className="mt-4 block text-center text-[13px] text-ink-3 hover:text-ink">
          ← Back to checklists
        </Link>
      </motion.form>
    </main>
  );
}
