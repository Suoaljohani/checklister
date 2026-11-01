"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, Pencil, Search, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import type { Checklist, FieldValue, Submission } from "@/lib/types";
import { currentMonth, cx, formatValue, isOutOfRange, monthRange, shiftOf, zoned } from "@/lib/utils";
import { useToast } from "../admin-shell";
import { api, PageTitle, useData } from "../use-data";

export default function RecordsPage() {
  const toast = useToast();
  const { data: checklists } = useData<Checklist[]>("/api/admin/checklists");
  const [chk, setChk] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [q, setQ] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const range = month ? monthRange(month) : null;
  const url = `/api/admin/submissions?signatures=1${chk ? `&checklist=${chk}` : ""}${range ? `&from=${range.from}&to=${range.to}` : ""}`;
  const { data, reload, setData } = useData<Submission[]>(url, 15000);
  const [edit, setEdit] = useState<Submission | null>(null);
  const [photo, setPhoto] = useState<{ src: string; title: string } | null>(null);

  const byId = useMemo(() => new Map((checklists ?? []).map((c) => [c.id, c])), [checklists]);
  const rows = (data ?? []).filter(
    (r) => (!flaggedOnly || r.flagged) && (!q || r.employee_name.toLowerCase().includes(q.toLowerCase())),
  );

  async function remove(r: Submission) {
    if (!confirm(`Delete this record by ${r.employee_name}? This can’t be undone.`)) return;
    try {
      await api(`/api/admin/submissions/${r.id}`, "DELETE");
      setData((d) => d?.filter((x) => x.id !== r.id) ?? null);
      toast("Record deleted");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div>
      <PageTitle title="Records" sub={`${rows.length} record${rows.length === 1 ? "" : "s"}`} />

      <div className="glass mb-4 grid gap-3 p-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
        <select className="field sm" value={chk} onChange={(e) => setChk(e.target.value)} aria-label="Checklist">
          <option value="">All checklists</option>
          {checklists?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title_en}
            </option>
          ))}
        </select>
        <input type="month" className="field sm" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input className="field sm pl-9" placeholder="Search staff name" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 px-2 text-[14px] text-ink-2">
          <input type="checkbox" className="h-4 w-4 accent-[#e0475b]" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
          Flagged only
        </label>
      </div>

      <div className="glass overflow-hidden p-0">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-ink/5 text-[12px] uppercase tracking-wider text-ink-3">
                <th className="px-4 py-3 font-semibold">Date / time</th>
                <th className="px-4 py-3 font-semibold">Checklist</th>
                <th className="px-4 py-3 font-semibold">Readings</th>
                <th className="px-4 py-3 font-semibold">Staff</th>
                <th className="px-4 py-3 font-semibold">Signature</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {rows.map((r) => {
                  const c = byId.get(r.checklist_id);
                  const z = zoned(r.submitted_at);
                  return (
                    <motion.tr
                      key={r.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.3 }}
                      className="border-b border-ink/5 last:border-0 hover:bg-white/10"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="num block font-medium">{z.date}</span>
                        <span className="num text-[12px] text-ink-3">
                          {z.dayShort} · {z.time} · {shiftOf(r.submitted_at)}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <span className="line-clamp-2">{c?.title_en ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {c && <Readings c={c} r={r} />}
                          {r.photos &&
                            Object.entries(r.photos).map(([k, src]) => (
                              <button
                                key={k}
                                onClick={() => setPhoto({ src, title: `${c?.fields.find((f) => f.key === k)?.label_en ?? "Photo"} · ${r.employee_name} · ${z.date} ${z.time}` })}
                                aria-label="View photo"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={src} alt="Attached photo" className="h-9 w-9 rounded-md object-cover ring-1 ring-white/20" />
                              </button>
                            ))}
                          {r.flagged && <CircleAlert className="h-4 w-4 text-danger" aria-label="Out of range" />}
                        </div>
                        {r.note && <p className="mt-1 max-w-[240px] truncate text-[12px] text-ink-3">“{r.note}”</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-medium">{r.employee_name}</span>
                        {r.employee_no && <span className="num text-[12px] text-ink-3">#{r.employee_no}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.signature ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.signature} alt={`Signature of ${r.employee_name}`} className="h-9 w-24 rounded-md bg-white/90 object-contain" />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEdit(r)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>{" "}
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(r)} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
          {data && rows.length === 0 && <p className="py-14 text-center text-ink-3">No records for this filter.</p>}
          {!data && <div className="m-4 h-40 animate-pulse rounded-xl bg-white/[0.06]" />}
        </div>
      </div>

      <Modal open={!!photo} onClose={() => setPhoto(null)} title={photo?.title ?? ""} wide>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={photo.src} alt="Attached photo" className="mx-auto max-h-[70vh] w-auto rounded-xl" />}
      </Modal>

      <EditRecord
        sub={edit}
        checklist={edit ? byId.get(edit.checklist_id) : undefined}
        onClose={() => setEdit(null)}
        onSaved={() => {
          setEdit(null);
          reload();
          toast("Record updated");
        }}
      />
    </div>
  );
}

function EditRecord({ sub, checklist, onClose, onSaved }: { sub: Submission | null; checklist?: Checklist; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<{ employee_name: string; employee_no: string; note: string; values: Record<string, FieldValue> } | null>(null);
  const [err, setErr] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  if (sub && sub.id !== lastId) {
    setLastId(sub.id);
    setForm({ employee_name: sub.employee_name, employee_no: sub.employee_no, note: sub.note, values: { ...sub.values } });
    setErr("");
  }

  async function save() {
    if (!sub || !form) return;
    try {
      await api(`/api/admin/submissions/${sub.id}`, "PATCH", form);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <Modal
      open={!!sub}
      onClose={() => {
        setLastId(null);
        onClose();
      }}
      title="Edit record"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save changes
          </button>
        </>
      }
    >
      {form && (
        <div className="flex flex-col gap-4">
          {checklist?.fields.map((f) => f.type === "heading" ? (
            <p key={f.key} className="-mb-2 text-[13px] font-semibold text-sky">{f.label_en}</p>
          ) : (
            <div key={f.key}>
              <label className="label">
                {f.label_en} {f.unit && <span className="font-normal text-ink-3">({f.unit})</span>}
              </label>
              {f.type === "yesno" || f.type === "check" ? (
                <select
                  className="field sm"
                  value={form.values[f.key] === null || form.values[f.key] === undefined ? "" : String(form.values[f.key])}
                  onChange={(e) => setForm({ ...form, values: { ...form.values, [f.key]: e.target.value === "" ? null : e.target.value === "true" } })}
                >
                  <option value="">—</option>
                  <option value="true">{f.type === "check" ? "✓ Available" : "Yes"}</option>
                  <option value="false">{f.type === "check" ? "✗ Missing" : "No"}</option>
                </select>
              ) : (
                <input
                  className="field sm"
                  inputMode={f.type === "number" ? "decimal" : undefined}
                  value={(form.values[f.key] as string | number | null) ?? ""}
                  onChange={(e) => setForm({ ...form, values: { ...form.values, [f.key]: e.target.value } })}
                />
              )}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Staff name</label>
              <input className="field sm" value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Employee no.</label>
              <input className="field sm" value={form.employee_no} onChange={(e) => setForm({ ...form, employee_no: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Note</label>
            <textarea className="field" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <p className="text-[12px] text-ink-3">Date, time and signature can’t be changed, so the record stays trustworthy.</p>
          {err && <p className="text-[13px] text-danger">{err}</p>}
        </div>
      )}
    </Modal>
  );
}

/** Short summary of a record's values. Item lists show a count plus anything missing. */
function Readings({ c, r }: { c: Checklist; r: Submission }) {
  const checks = c.fields.filter((f) => f.type === "check");
  const missing = checks.filter((f) => r.values[f.key] === false);
  const others = c.fields.filter((f) => f.type !== "check" && f.type !== "heading");
  return (
    <>
      {checks.length > 0 && (
        <span className={cx("num rounded-full px-2 py-0.5 text-[12px]", missing.length ? "bg-danger/10 font-semibold text-danger" : "bg-white/[0.06]")}>
          {checks.length - missing.length}/{checks.length} ✓
        </span>
      )}
      {missing.slice(0, 4).map((f) => (
        <span key={f.key} className="rounded-full bg-danger/10 px-2 py-0.5 text-[12px] font-semibold text-danger">
          ✗ {f.label_en}
        </span>
      ))}
      {missing.length > 4 && <span className="text-[12px] text-danger">+{missing.length - 4} more</span>}
      {others.slice(0, 8).map((f) => {
        const v = r.values[f.key];
        const bad = isOutOfRange(f, v) || (f.type === "yesno" && v === false);
        return (
          <span key={f.key} className={cx("num rounded-full px-2 py-0.5 text-[12px]", bad ? "bg-danger/10 font-semibold text-danger" : "bg-white/[0.06]")} title={f.label_en}>
            {formatValue(f, v) || "—"}
          </span>
        );
      })}
    </>
  );
}
