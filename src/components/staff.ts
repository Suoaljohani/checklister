"use client";

import { useEffect, useState } from "react";

export type Staff = { name: string; no: string };
export type StaffMode = "open" | "accounts";
const KEY = "chk_staff";

function persist(s: Staff | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {}
}

/**
 * Who is filling in checklists on this device.
 * open: no staff accounts exist, staff type their name.
 * accounts: staff sign in with employee number + password; the server session is the source of truth.
 */
export function useStaff() {
  const [staff, setStaffState] = useState<Staff | null>(null);
  const [mode, setMode] = useState<StaffMode>("open");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let local: Staff | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) local = JSON.parse(raw);
    } catch {}
    fetch("/api/staff/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { mode: StaffMode; staff: Staff | null }) => {
        setMode(j.mode);
        const s = j.mode === "accounts" ? j.staff : local;
        setStaffState(s);
        persist(s);
      })
      .catch(() => setStaffState(local))
      .finally(() => setReady(true));
  }, []);
  const setStaff = (s: Staff | null) => {
    setStaffState(s);
    persist(s);
  };
  async function signIn(employee_no: string, password: string) {
    const r = await fetch("/api/staff/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ employee_no, password }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Could not sign in");
    setStaff({ name: j.name, no: j.no });
  }
  async function signOut() {
    if (mode === "accounts") await fetch("/api/staff/logout", { method: "POST" }).catch(() => {});
    setStaff(null);
  }
  return { staff, setStaff, ready, mode, signIn, signOut };
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
