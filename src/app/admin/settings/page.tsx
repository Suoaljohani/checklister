"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";
import { useToast } from "../admin-shell";
import { api, PageTitle, useData } from "../use-data";

export default function SettingsPage() {
  const toast = useToast();
  const { data } = useData<Settings>("/api/admin/settings");
  const [form, setForm] = useState<{ en: string; ar: string; owner: string } | null>(null);
  const [pw, setPw] = useState({ a: "", b: "" });

  if (data && !form) setForm({ en: data.header_en.join("\n"), ar: data.header_ar.join("\n"), owner: data.copyright_owner });

  async function saveHeader() {
    if (!form) return;
    try {
      await api("/api/admin/settings", "PUT", {
        header_en: form.en.split("\n").map((s) => s.trim()).filter(Boolean),
        header_ar: form.ar.split("\n").map((s) => s.trim()).filter(Boolean),
        copyright_owner: form.owner,
      });
      toast("Settings saved");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function savePw() {
    if (pw.a !== pw.b) return toast("Passwords don’t match", "error");
    try {
      await api("/api/admin/settings", "PUT", { new_password: pw.a });
      setPw({ a: "", b: "" });
      toast("Password changed");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div className="max-w-3xl">
      <PageTitle title="Settings" sub="Report header, copyright and admin password" />

      <section className="glass p-5">
        <p className="text-[17px] font-semibold">Report header</p>
        <p className="mt-0.5 text-[13px] text-ink-3">Printed at the top of every PDF and Word export, one line per row.</p>
        {form && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">English (left side)</label>
              <textarea className="field" rows={4} value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} />
            </div>
            <div>
              <label className="label">Arabic (right side)</label>
              <textarea className="field" dir="rtl" rows={4} value={form.ar} onChange={(e) => setForm({ ...form, ar: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Copyright owner</label>
              <input className="field sm" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <button className="btn btn-primary" onClick={saveHeader}>
                Save
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="glass mt-4 p-5">
        <p className="text-[17px] font-semibold">Admin password</p>
        <p className="mt-0.5 text-[13px] text-ink-3">At least 6 characters. You’ll use it the next time you sign in.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className="label">New password</label>
            <input type="password" autoComplete="new-password" className="field sm" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} />
          </div>
          <div>
            <label className="label">Repeat</label>
            <input type="password" autoComplete="new-password" className="field sm" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} />
          </div>
          <button className="btn btn-ghost h-[42px]" onClick={savePw} disabled={pw.a.length < 6}>
            Change
          </button>
        </div>
      </section>
    </div>
  );
}
