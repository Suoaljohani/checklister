"use client";

import { useCallback, useEffect, useState } from "react";

export function useData<T>(url: string | null, pollMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    if (!url) return;
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.status === 401) {
        location.reload();
        return;
      }
      if (!r.ok) throw new Error();
      setData(await r.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, [url]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once after mount (browser-only value / data fetch)
    load();
    if (!pollMs) return;
    const t = setInterval(() => document.visibilityState === "visible" && load(), pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);
  return { data, error, reload: load, setData };
}

export async function api<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Something went wrong");
  return j as T;
}

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] sm:text-[32px]">{title}</h1>
        {sub && <p className="mt-0.5 text-[14px] text-ink-3">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
