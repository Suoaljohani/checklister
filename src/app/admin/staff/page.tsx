"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Info, Pencil, Plus, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { Modal } from "@/components/modal";
import { EASE } from "@/components/motion";
import type { Employee } from "@/lib/types";
import { cx } from "@/lib/utils";
import { useToast } from "../admin-shell";
import { api, PageTitle, useData } from "../use-data";

type Draft = Partial<Employee> & { password?: string };

export default function StaffPage() {
  const toast = useToast();
  const { data, reload, setData } = useData<Employee[]>("/api/admin/employees");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const rows = (data ?? []).filter(
    (e) => !q || `${e.name} ${e.name_ar} ${e.employee_no} ${e.job_title}`.toLowerCase().includes(q.toLowerCase()),
  );
  const activeCount = (data ?? []).filter((e) => e.active).length;

  async function save() {
    if (!draft) return;
    setErr("");
    setBusy(true);
    try {
      const body = { ...draft, password: draft.password || undefined };
      if (draft.id) await api(`/api/admin/employees/${draft.id}`, "PATCH", body);
      else await api("/api/admin/employees", "POST", body);
      toast(draft.id ? "Employee saved" : "Employee added");
      setDraft(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(e: Employee) {
    setData((x) => x?.map((y) => (y.id === e.id ? { ...y, active: !e.active } : y)) ?? null);
    try {
      await api(`/api/admin/employees/${e.id}`, "PATCH", { active: !e.active });
      toast(e.active ? "Account turned off" : "Account turned on");
    } catch (x) {
      toast((x as Error).message, "error");
      reload();
    }
  }

  async function remove(e: Employee) {
    if (!confirm(`Delete the account of ${e.name}? Their past records stay.`)) return;
    try {
      await api(`/api/admin/employees/${e.id}`, "DELETE");
      setData((x) => x?.filter((y) => y.id !== e.id) ?? null);
      toast("Employee deleted");
    } catch (x) {
      toast((x as Error).message, "error");
    }
  }

  return (
    <div>
      <PageTitle title="Staff" sub={data ? `${activeCount} active account${activeCount === 1 ? "" : "s"}` : "Employee accounts"}>
        <button
          className="btn btn-primary"
          onClick={() => {
            setErr("");
            setDraft({ name: "", name_ar: "", employee_no: "", job_title: "", password: "", active: true });
          }}
        >
          <Plus className="h-4 w-4" /> New employee
        </button>
      </PageTitle>

      <div className="glass mb-4 flex items-start gap-3 p-4 text-[13px] text-ink-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky" />
        {activeCount > 0 ? (
          <p>
            Staff sign in with their <b>employee number</b> and <b>password</b> before filling in checklists. Their name is taken from the account.
            <span className="mt-1 block" dir="rtl">
              يدخل الموظف برقمه الوظيفي وكلمة المرور، ويُسجَّل اسمه تلقائياً.
            </span>
          </p>
        ) : (
          <p>
            No accounts yet, so staff just type their name. Once you add the first employee, everyone must sign in with an account.
            <span className="mt-1 block" dir="rtl">
              لا توجد حسابات بعد. عند إضافة أول موظف يصبح الدخول بالحساب إلزامياً.
            </span>
          </p>
        )}
      </div>

      {(data?.length ?? 0) > 6 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input className="field sm pl-9" placeholder="Search name or number" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {rows.map((e) => (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={cx("glass flex flex-wrap items-center gap-3 p-3.5 sm:gap-4", !e.active && "opacity-60")}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal to-blue text-[15px] font-semibold text-white">
                {e.name.trim().slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {e.name}
                  {e.name_ar && <span className="ml-2 font-normal text-ink-3">{e.name_ar}</span>}
                </p>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  <span className="num">#{e.employee_no}</span>
                  {e.job_title && ` · ${e.job_title}`}
                  {!e.active && " · turned off"}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => toggle(e)}
                  aria-label={e.active ? "Turn off account" : "Turn on account"}
                  title={e.active ? "Active – click to turn off" : "Turned off – click to turn on"}
                >
                  {e.active ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => {
                    setErr("");
                    setDraft({ ...e, password: "" });
                  }}
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(e)} aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {data?.length === 0 && <p className="glass p-8 text-center text-ink-3">No employee accounts yet.</p>}
        {!data && <div className="glass h-20 animate-pulse" />}
      </div>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit employee" : "New employee"}
        footer={
          <>
            {err && <p className="mr-auto self-center text-[13px] text-danger">{err}</p>}
            <button className="btn btn-ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save} disabled={busy}>
              {draft?.id ? "Save" : "Add"}
            </button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name (English)</label>
              <input className="field sm" autoComplete="off" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Name (Arabic)</label>
              <input className="field sm" dir="rtl" autoComplete="off" value={draft.name_ar ?? ""} onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })} />
            </div>
            <div>
              <label className="label">Employee no.</label>
              <input
                className="field sm num"
                inputMode="numeric"
                autoComplete="off"
                value={draft.employee_no ?? ""}
                onChange={(e) => setDraft({ ...draft, employee_no: e.target.value })}
              />
            </div>
            <div>
              <label className="label">
                Job title <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <input className="field sm" placeholder="e.g. Staff Nurse" value={draft.job_title ?? ""} onChange={(e) => setDraft({ ...draft, job_title: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{draft.id ? "New password" : "Password"}</label>
              <input
                className="field sm"
                type="password"
                autoComplete="new-password"
                placeholder={draft.id ? "Leave empty to keep the current password" : "At least 4 characters"}
                value={draft.password ?? ""}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-[14px] text-ink-2 sm:col-span-2">
              <input type="checkbox" className="h-4 w-4 accent-[#1691d0]" checked={draft.active ?? true} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              Account is active (can sign in)
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
