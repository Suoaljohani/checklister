"use client";

import { useEffect, useState } from "react";
import { zoned } from "@/lib/utils";

export function useNow(interval = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once after mount (browser-only value / data fetch)
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

export function LiveClock({ className = "" }: { className?: string }) {
  const now = useNow();
  const z = now ? zoned(now) : null;
  return (
    <div className={`flex items-center gap-2 text-[13px] text-ink-2 ${className}`} aria-live="off">
      <span className="pulse-dot" aria-hidden />
      <span className="num tabular-nums">{z ? `${z.day} · ${z.date} · ${z.time}` : "—"}</span>
    </div>
  );
}
