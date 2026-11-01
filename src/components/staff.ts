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

/* Saved signature: kept only on this phone, tied to the staff name it was drawn for. */
const SIG_KEY = "chk_signature";

export function getSavedSignature(name: string): string | null {
  try {
    const raw = localStorage.getItem(SIG_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { name?: string; png?: string };
    const same = (s.name ?? "").trim().toLowerCase() === name.trim().toLowerCase();
    return same && s.png?.startsWith("data:image/png;base64,") ? s.png : null;
  } catch {
    return null;
  }
}

export function saveSignature(name: string, png: string) {
  try {
    localStorage.setItem(SIG_KEY, JSON.stringify({ name: name.trim(), png }));
  } catch {}
}

export function clearSavedSignature() {
  try {
    localStorage.removeItem(SIG_KEY);
  } catch {}
}
