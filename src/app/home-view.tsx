"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ClipboardList, UserRound } from "lucide-react";
import { HospitalBadge, Wordmark } from "@/components/brand";
import { LiveClock } from "@/components/clock";
import { Icon } from "@/components/icon";
import { Rise } from "@/components/motion";
import { Ring } from "@/components/ring";
import { StaffNav } from "@/components/staff-nav";
import type { Department } from "@/lib/types";
import { cx } from "@/lib/utils";

type Dep = Department & { count: number; done: number };
type Data = { departments: Dep[]; today: { done: number; total: number } };

export function HomeView() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/public/departments")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const deps = data?.departments;
  const pct = data && data.today.total ? data.today.done / data.today.total : 0;
  const first = deps?.[0];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-[max(14px,env(safe-area-inset-top))] sm:px-6 sm:pb-6">
      <header className="flex items-center justify-between gap-3 py-3">
        <Wordmark />
        <div className="flex items-center gap-3">
          <span className="hidden md:block">
            <HospitalBadge size={30} />
          </span>
          <Link href="/admin" className="btn btn-ghost btn-sm btn-icon rounded-full" aria-label="Admin sign in">
            <UserRound className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </header>

      <div className="mt-4 grid gap-5 md:mt-10 md:grid-cols-[1.15fr_1fr] md:items-end">
        <section>
          <Rise>
            <p className="flex items-center gap-2 text-[15px] font-medium text-ink-2" dir="rtl">
              <ClipboardList className="h-4 w-4 text-sky" /> قسم الطوارئ
            </p>
          </Rise>
          <Rise i={1}>
            <h1 className="mt-2 text-[44px] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[64px]">
              <span className="text-er drop-shadow-[0_0_18px_rgba(255,90,106,.35)]">ER</span> Checklist
            </h1>
          </Rise>
          <Rise i={2}>
            <p className="mt-3 max-w-md text-[16px] leading-relaxed text-ink-2" dir="rtl">
              إدارة القوائم التشغيلية لضمان جاهزية وسلامة قسم الطوارئ والرعاية
            </p>
            <p className="mt-1 text-[14px] text-ink-3">Daily operational checklists for a safe, ready Emergency Department.</p>
          </Rise>
          <Rise i={3}>
            <LiveClock className="glass mt-5 inline-flex rounded-full px-4 py-2" />
          </Rise>
        </section>

        <Rise i={4}>
          <Link
            href={first ? `/d/${first.slug}` : "/"}
            className="glass glass-hover sheen focus-ring flex items-center gap-5 p-5"
            aria-label="Today's checklist completion"
          >
            <Ring pct={pct} size={104} />
            <div className="min-w-0 flex-1" dir="rtl">
              <p className="text-[17px] font-semibold leading-snug">مستوى الالتزام بالقوائم التشغيلية اليوم</p>
              <p className="mt-1 text-[13px] text-ink-3" dir="ltr">
                Today’s completion ·{" "}
                <span className="num text-ink-2">
                  {data?.today.done ?? 0}/{data?.today.total ?? 0}
                </span>{" "}
                checklists
              </p>
            </div>
            <ChevronLeft className="h-5 w-5 shrink-0 text-ink-3" />
          </Link>
        </Rise>
      </div>

      <section aria-labelledby="deps" className="mt-8">
        <Rise i={5}>
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 id="deps" className="eyebrow">
              Departments
            </h2>
            <span className="text-[14px] font-medium text-ink-3" dir="rtl">
              الأقسام
            </span>
          </div>
        </Rise>
        {error && <p className="glass p-6 text-center text-ink-2">Couldn’t load departments. Check your connection and refresh.</p>}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {!deps && !error
            ? [0, 1].map((i) => <div key={i} className="glass h-[150px] animate-pulse opacity-60" />)
            : deps?.map((d, i) => (
                <Rise key={d.id} i={6 + i}>
                  <Link
                    href={`/d/${d.slug}`}
                    className={cx("glass glass-hover sheen focus-ring flex h-full flex-col items-center gap-3 px-3 py-5 text-center", i === 0 && "glow")}
                  >
                    <Icon name={d.icon} className={cx("h-9 w-9", i === 0 ? "text-sky drop-shadow-[0_0_10px_rgba(47,211,224,.8)]" : "text-ink")} strokeWidth={1.5} />
                    <span>
                      <span className="block text-[17px] font-semibold" dir="rtl">
                        {d.name_ar || d.name_en}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-ink-3">{d.name_en}</span>
                    </span>
                    <span className="num rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[12px] text-ink-2">
                      {d.done}/{d.count} today
                    </span>
                  </Link>
                </Rise>
              ))}
        </div>
        {deps?.length === 0 && <p className="glass p-6 text-ink-2">No departments yet. An admin can add them from the dashboard.</p>}
      </section>

      <StaffNav />
    </main>
  );
}
