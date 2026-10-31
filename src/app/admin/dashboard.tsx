"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { Activity, CalendarRange, CircleAlert, ClipboardCheck, Sigma, Trophy } from "lucide-react";
import { useNow } from "@/components/clock";
import { Icon } from "@/components/icon";
import { Counter, Ring } from "@/components/ring";
import { EASE, Rise } from "@/components/motion";
import type { Stats } from "@/lib/types";
import { cx, zoned } from "@/lib/utils";
import { PageTitle, useData } from "./use-data";

export function Dashboard() {
  const { data, error } = useData<Stats>("/api/admin/stats", 5000);
  const now = useNow();
  const since = data && now ? Math.max(0, Math.round((now.getTime() - new Date(data.generated_at).getTime()) / 1000)) : 0;

  return (
    <div>
      <PageTitle title="Dashboard" sub="Live overview of ER checklist activity">
        <span className="glass flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-semibold tracking-wide text-ink-2" style={{ borderRadius: 999 }}>
          <span className={cx("pulse-dot", error && "!bg-danger")} />
          {error ? "RECONNECTING" : "LIVE"}
          <span className="num font-normal text-ink-3">{data ? `${since}s ago` : "…"}</span>
        </span>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi i={0} icon={<ClipboardCheck />} label="Checks today" value={data?.totals.today} tint="#2FD3E0" />
        <Kpi i={1} icon={<CalendarRange />} label="Last 7 days" value={data?.totals.week} tint="#3AC0C3" />
        <Kpi i={2} icon={<Sigma />} label="This month" value={data?.totals.month} tint="#7CE9F0" sub={data ? `${data.totals.all} all-time` : ""} />
        <Kpi
          i={3}
          icon={<CircleAlert />}
          label="Out of range (month)"
          value={data?.totals.flagged_month}
          tint={data?.totals.flagged_month ? "#E0475B" : "#04A67A"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Rise i={4} className="glass p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Activity</p>
              <p className="mt-1 text-[17px] font-semibold">Submissions · last 14 days</p>
            </div>
            <div className="flex gap-3 text-[12px] text-ink-3">
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-blue" /> Checks
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-danger" /> Flagged
              </span>
            </div>
          </div>
          <TrendChart data={data?.trend} />
        </Rise>

        <Rise i={5} className="glass flex flex-col items-center justify-center p-5 text-center">
          <p className="eyebrow self-start">Today’s compliance</p>
          <div className="my-4"><Ring pct={data?.compliance_today.expected ? data.compliance_today.done / data.compliance_today.expected : 0} size={160} stroke={8} /></div>
          <p className="text-[14px] text-ink-2">
            <span className="num font-semibold text-ink">
              {data?.compliance_today.done ?? 0}/{data?.compliance_today.expected ?? 0}
            </span>{" "}
            checklists completed today
          </p>
        </Rise>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.per_checklist.map((c, i) => (
          <Rise key={c.id} i={6 + i} className="glass p-5">
            <div className="flex items-start gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-white"
                style={{ background: `linear-gradient(145deg, ${c.color}, color-mix(in oklab, ${c.color} 55%, #283a83))` }}
              >
                <Icon name={c.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[14px] font-semibold leading-snug">{c.title_en}</p>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {c.department} · {c.month_count} this month
                </p>
              </div>
              <span
                className={cx(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  c.done_today ? "bg-green/12 text-green" : "bg-warn/15 text-warn",
                )}
              >
                {c.done_today ? "Done today" : "Pending"}
              </span>
            </div>
            <Sparkline c={c} />
            <p className="num mt-1 text-[12px] text-ink-3">
              {c.last_at ? `Last: ${zoned(c.last_at).date} · ${zoned(c.last_at).time}` : "No checks yet"}
            </p>
          </Rise>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Rise i={9} className="glass p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-ink-3" />
            <p className="text-[17px] font-semibold">Recent activity</p>
          </div>
          <ul className="flex flex-col">
            <AnimatePresence initial={false}>
              {data?.recent.map((r) => (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: -12, backgroundColor: "rgba(43,170,226,0.18)" }}
                  animate={{ opacity: 1, y: 0, backgroundColor: "rgba(43,170,226,0)" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: EASE, backgroundColor: { duration: 2.4 } }}
                  className="flex items-center gap-3 rounded-xl border-b border-ink/5 px-2 py-3 last:border-0"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: r.color }}>
                    <Icon name={r.icon} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">
                      {r.employee_name} <span className="font-normal text-ink-3">checked</span> {r.checklist}
                    </p>
                    <p className="num truncate text-[12px] text-ink-3">{r.summary}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {r.flagged && <span className="mb-0.5 block text-[11px] font-semibold text-danger">Out of range</span>}
                    <span className="num text-[12px] text-ink-3">{ago(r.submitted_at)}</span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
            {data && data.recent.length === 0 && <li className="py-8 text-center text-[14px] text-ink-3">No submissions yet. They’ll appear here live.</li>}
          </ul>
        </Rise>

        <Rise i={10} className="glass p-5">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-ink-3" />
            <p className="text-[17px] font-semibold">Most active this month</p>
          </div>
          <ul className="flex flex-col gap-3">
            {data?.top_staff.map((s, i) => {
              const max = data.top_staff[0].count || 1;
              return (
                <li key={s.name}>
                  <div className="flex justify-between text-[14px]">
                    <span className="truncate font-medium">{s.name}</span>
                    <span className="num text-ink-3">{s.count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-sky to-navy"
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.count / max) * 100}%` }}
                      transition={{ duration: 1, ease: EASE, delay: 0.3 + i * 0.08 }}
                    />
                  </div>
                </li>
              );
            })}
            {data && data.top_staff.length === 0 && <li className="py-6 text-center text-[14px] text-ink-3">No data yet</li>}
          </ul>
        </Rise>
      </div>
    </div>
  );
}

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return zoned(iso).date;
}

function Kpi({ i, icon, label, value, tint, sub }: { i: number; icon: React.ReactNode; label: string; value?: number; tint: string; sub?: string }) {
  const prev = useRef<number | undefined>(undefined);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (prev.current !== undefined && value !== undefined && value > prev.current) setBump((b) => b + 1);
    prev.current = value;
  }, [value]);
  return (
    <Rise i={i} className="glass sheen relative overflow-hidden p-4 sm:p-5">
      <motion.span
        key={bump}
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        initial={{ boxShadow: bump ? `inset 0 0 0 2px ${tint}88` : "inset 0 0 0 0 transparent" }}
        animate={{ boxShadow: "inset 0 0 0 0px transparent" }}
        transition={{ duration: 1.6 }}
      />
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink-2">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-xl [&>svg]:h-4 [&>svg]:w-4" style={{ background: `${tint}1f`, color: tint }}>
          {icon}
        </span>
      </div>
      <p className="num mt-3 text-[34px] font-semibold leading-none sm:text-[40px]">{value === undefined ? "—" : <Counter value={value} />}</p>
      <p className="mt-1.5 h-4 text-[12px] text-ink-3">{sub}</p>
    </Rise>
  );
}

function TrendChart({ data }: { data?: Stats["trend"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(4, ...(data?.map((d) => d.count) ?? [0]));
  const H = 180;
  return (
    <div ref={ref} className="relative mt-5">
      <div className="flex h-[200px] items-end gap-1.5 sm:gap-2" onMouseLeave={() => setHover(null)}>
        {(data ?? Array.from({ length: 14 }, (_, i) => ({ date: String(i), count: 0, flagged: 0 }))).map((d, i) => {
          const h = (d.count / max) * H;
          const fh = (d.flagged / max) * H;
          const isToday = i === 13;
          return (
            <div
              key={d.date}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
            >
              <AnimatePresence>
                {hover === i && data && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="glass-strong pointer-events-none absolute z-10 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[12px]"
                    style={{ bottom: h + 10, borderRadius: 12 }}
                  >
                    <span className="num font-semibold">{d.count}</span> checks
                    {d.flagged > 0 && <span className="text-danger"> · {d.flagged} flagged</span>}
                    <span className="block text-[11px] text-ink-3">{d.date.slice(5).split("-").reverse().join("/")}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div
                className={cx(
                  "relative w-full max-w-[34px] overflow-hidden rounded-t-[8px] rounded-b-[3px]",
                  isToday ? "bg-gradient-to-t from-blue to-sky" : "bg-gradient-to-t from-blue/55 to-sky/45",
                  hover === i && "brightness-110",
                )}
                initial={{ height: 2 }}
                animate={{ height: inView ? Math.max(2, h) : 2 }}
                transition={{ type: "spring", stiffness: 140, damping: 20, delay: inView ? i * 0.035 : 0 }}
              >
                {fh > 0 && (
                  <motion.div
                    className="absolute inset-x-0 bottom-0 bg-danger/85"
                    initial={{ height: 0 }}
                    animate={{ height: fh }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.4 + i * 0.035 }}
                  />
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {data?.map((d, i) => (
          <span key={d.date} className={cx("num flex-1 text-center text-[10px]", i === 13 ? "font-semibold text-ink" : "text-ink-3")}>
            {i % 2 === 1 || i === 13 ? d.date.slice(8) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ c }: { c: Stats["per_checklist"][number] }) {
  const pts = c.series.filter((p) => p.value !== null) as { at: string; value: number }[];
  const W = 300;
  const H = 70;
  if (pts.length < 2)
    return <div className="mt-4 grid h-[70px] place-items-center rounded-xl bg-white/[0.06] text-[12px] text-ink-3">Trend appears after 2 checks</div>;
  const vals = pts.map((p) => p.value);
  let lo = Math.min(...vals, c.min ?? Infinity);
  let hi = Math.max(...vals, c.max ?? -Infinity);
  if (hi - lo < 1) {
    hi += 0.5;
    lo -= 0.5;
  }
  const pad = (hi - lo) * 0.15;
  lo -= pad;
  hi += pad;
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const out = (v: number) => (c.min != null && v < c.min) || (c.max != null && v > c.max);
  const gid = `g-${c.id}`;
  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[70px] w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={c.color} stopOpacity="0.28" />
            <stop offset="1" stopColor={c.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {c.min != null && c.max != null && (
          <rect x="0" width={W} y={y(Math.min(c.max, hi))} height={Math.max(0, y(Math.max(c.min, lo)) - y(Math.min(c.max, hi)))} fill="rgba(4,166,122,.07)" />
        )}
        <motion.path
          d={`${d} L${W},${H} L0,${H} Z`}
          fill={`url(#${gid})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        />
        <motion.path
          d={d}
          fill="none"
          stroke={c.color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, ease: EASE, delay: 0.2 }}
        />
        {pts.map((p, i) =>
          out(p.value) ? <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill="var(--danger)" vectorEffect="non-scaling-stroke" /> : null,
        )}
      </svg>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-[12px] text-ink-3">
          {c.primary_label}
          {c.min != null && c.max != null ? ` · normal ${c.min}–${c.max}${c.primary_unit}` : ""}
        </span>
        <span className={cx("num text-[18px] font-semibold", out(last.value) ? "text-danger" : "text-ink")}>
          {last.value}
          <span className="text-[12px] font-normal text-ink-3">{c.primary_unit}</span>
        </span>
      </div>
    </div>
  );
}
