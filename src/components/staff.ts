"use client";

import { useEffect, useState } from "react";

export type Staff = { name: string; no: string };
const KEY = "chk_staff";

export function useStaff() {
  const [staff, setStaffState] = useState<Staff | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once after mount (browser-only value / data fetch)
      if (raw) setStaffState(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);
  const setStaff = (s: Staff | null) => {
    setStaffState(s);
    try {
      if (s) localStorage.setItem(KEY, JSON.stringify(s));
      else localStorage.removeItem(KEY);
    } catch {}
  };
  return { staff, setStaff, ready };
}

export function greeting(d: Date) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", hour: "numeric", hour12: false }).format(d));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
