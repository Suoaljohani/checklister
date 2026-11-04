"use client";

import { useState } from "react";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, LockOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { Icon, ICONS } from "@/components/icon";
import { Modal } from "@/components/modal";
import { EASE } from "@/components/motion";
import type { Checklist, Department, Field } from "@/lib/types";
import { TEMPLATES, type Template } from "@/lib/templates";
import { cx, rangeLabel } from "@/lib/utils";
import { useToast } from "../admin-shell";
import { api, PageTitle, useData } from "../use-data";

const COLORS = ["#1691D0", "#2BAAE2", "#3AC0C3", "#04A67A", "#9ECC3B", "#283A83", "#7A5AF8", "#E9A23B", "#E0475B", "#51938B"];

type Draft = Omit<Checklist, "id" | "created_at"> & { id?: string };

const blankField = (): Field & { _k: string } => ({
  _k: Math.random().toString(36).slice(2),
  key: "",
  label_en: "",
  label_ar: "",
  type: "number",
  unit: "°C",
  min: null,
  max: null,
  required: true,
});

export default function ChecklistsPage() {
  const toast = useToast();
  const { data, reload, setData } = useData<Checklist[]>("/api/admin/checklists");
  const { data: deps } = useData<Department[]>("/api/admin/departments");
  const [draft, setDraft] = useState<Draft | null>(null);

  function create() {
    setDraft({
      department_id: deps?.[0]?.id ?? "",
      title_en: "",
      title_ar: "",
      icon: "ClipboardCheck",
      color: COLORS[0],
      fields: [blankField()],
      range_note: "",
      footer_note: "Infection Prevention and Control Department",
      orientation: "portrait",
      sort: (data?.length ?? 0) + 1,
      active: true,
    });
  }

  async function toggle(c: Checklist) {
    setData((d) => d?.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x)) ?? null);
    try {
      await api(`/api/admin/checklists/${c.id}`, "PATCH", { active: !c.active });
      toast(c.active ? "Hidden from staff" : "Visible to staff");
    } catch (e) {
      toast((e as Error).message, "error");
      reload();
    }
  }

  async function toggleLock(c: Checklist) {
    let body: { locked: boolean; lock_code?: string };
    if (c.locked) {
      if (!confirm(`Remove the code from “${c.title_en}”? Staff will open it without a code.`)) return;
      body = { locked: false };
    } else {
      const code = prompt(`Set a code for “${c.title_en}”.\nStaff must enter it before opening this checklist (at least 4 characters).`);
      if (code === null) return;
      if (code.trim().length < 4) return toast("The code needs at least 4 characters", "error");
      body = { locked: true, lock_code: code.trim() };
    }
    try {
      await api(`/api/admin/checklists/${c.id}`, "PATCH", body);
      setData((d) => d?.map((x) => (x.id === c.id ? { ...x, locked: body.locked } : x)) ?? null);
      toast(body.locked ? "Locked with a code" : "Lock removed");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function move(i: number, dir: -1 | 1) {
    if (!data) return;
    const j = i + dir;
    if (j < 0 || j >= data.length) return;
    const next = [...data];
    [next[i], next[j]] = [next[j], next[i]];
    setData(next);
    await Promise.all(next.map((c, k) => (c.sort !== k + 1 ? api(`/api/admin/checklists/${c.id}`, "PATCH", { sort: k + 1 }) : null)));
    reload();
  }

  async function remove(c: Checklist) {
    if (!confirm(`Delete “${c.title_en}” and ALL of its records? This can’t be undone.\n\nTip: use the eye button to hide it instead.`)) return;
    try {
      await api(`/api/admin/checklists/${c.id}`, "DELETE");
      setData((d) => d?.filter((x) => x.id !== c.id) ?? null);
      toast("Checklist deleted");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div>
      <PageTitle title="Checklists" sub="Add, edit, reorder or hide the checklists staff see">
        <button className="btn btn-primary" onClick={create} disabled={!deps?.length}>
          <Plus className="h-4 w-4" /> New checklist
        </button>
      </PageTitle>

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {data?.map((c, i) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: EASE }}
              className={cx("glass flex flex-wrap items-center gap-4 p-4", !c.active && "opacity-60")}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white" style={{ background: c.color }}>
                <Icon name={c.icon} className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">
                  {c.title_en}
                  {c.locked && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 align-middle text-[11px] font-semibold text-warn">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  {deps?.find((d) => d.id === c.department_id)?.name_en ?? "—"} ·{" "}
                  {c.fields.filter((f) => f.type !== "heading").length > 6
                    ? `${c.fields.filter((f) => f.type !== "heading").length} items`
                    : c.fields.map((f) => `${f.label_en}${rangeLabel(f) ? ` (${rangeLabel(f)})` : ""}`).join(", ")}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => move(i, 1)} disabled={i === data.length - 1} aria-label="Move down">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  className={cx("btn btn-sm btn-icon", c.locked ? "border border-warn/40 bg-warn/15 text-warn" : "btn-ghost")}
                  onClick={() => toggleLock(c)}
                  aria-label={c.locked ? "Remove lock" : "Lock with a code"}
                  title={c.locked ? "Locked – click to remove the code" : "Lock with a code"}
                >
                  {c.locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => toggle(c)} aria-label={c.active ? "Hide" : "Show"} title={c.active ? "Visible – click to hide" : "Hidden – click to show"}>
                  {c.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => setDraft({ ...c, fields: c.fields.map((f) => ({ ...f, _k: f.key })) as Field[] })}
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(c)} aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {data?.length === 0 && <p className="glass p-10 text-center text-ink-3">No checklists yet.</p>}
        {!data && <div className="glass h-24 animate-pulse" />}
      </div>

      <Editor
        draft={draft}
        deps={deps ?? []}
        onClose={() => setDraft(null)}
        onSaved={(msg) => {
          setDraft(null);
          reload();
          toast(msg);
        }}
      />
    </div>
  );
}

function Editor({ draft, deps, onClose, onSaved }: { draft: Draft | null; deps: Department[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [d, setD] = useState<Draft | null>(null);
  const [src, setSrc] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState("");
  if (draft !== src) {
    setSrc(draft);
    setD(draft);
    setErr("");
    setPicked("");
  }
  if (!d) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;

  const fields = d.fields as (Field & { _k?: string })[];
  const setField = (i: number, patch: Partial<Field>) => setD({ ...d, fields: fields.map((f, k) => (k === i ? { ...f, ...patch } : f)) });

  function applyTemplate(t: Template | null) {
    if (!d || !draft) return;
    setPicked(t?.name ?? "");
    if (!t) return setD({ ...draft });
    setD({
      ...d,
      title_en: t.title_en,
      title_ar: t.title_ar,
      icon: t.icon,
      color: t.color,
      range_note: t.range_note,
      orientation: t.orientation,
      fields: t.fields.map((f) => ({ ...f, options: f.options && [...f.options], _k: Math.random().toString(36).slice(2) })),
    });
  }

  async function save() {
    if (!d) return;
    setBusy(true);
    setErr("");
    try {
      const body = { ...d, layout: d.layout ?? null, fields: fields.map((f) => ({ ...f, _k: undefined })) };
      if (d.id) await api(`/api/admin/checklists/${d.id}`, "PATCH", body);
      else await api(`/api/admin/checklists`, "POST", body);
      onSaved(d.id ? "Checklist saved" : "Checklist created");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!draft}
      onClose={onClose}
      wide
      title={d.id ? "Edit checklist" : "New checklist"}
      footer={
        <>
          {err && <p className="mr-auto self-center text-[13px] text-danger">{err}</p>}
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {d.id ? "Save" : "Create"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {!d.id && (
          <div className="sm:col-span-2">
            <label className="label">Start from a template</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyTemplate(null)}
                className={cx("btn btn-sm border", !picked ? "border-blue/40 bg-blue/10 text-blue" : "border-ink/10 bg-white/[0.06] text-ink-2")}
              >
                <Plus className="h-3.5 w-3.5" /> Blank
              </button>
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className={cx("btn btn-sm border", picked === t.name ? "border-blue/40 bg-blue/10 text-blue" : "border-ink/10 bg-white/[0.06] text-ink-2")}
                >
                  <Icon name={t.icon} className="h-3.5 w-3.5" /> {t.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-ink-3">Fills in the title, fields and normal ranges. You can change anything before saving. Check the ranges match your hospital policy.</p>
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="label">Title (English)</label>
          <input className="field sm" value={d.title_en} onChange={(e) => setD({ ...d, title_en: e.target.value })} placeholder="Daily Temperature Check for Refrigerator" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Title (Arabic)</label>
          <input className="field sm" dir="rtl" value={d.title_ar} onChange={(e) => setD({ ...d, title_ar: e.target.value })} />
        </div>
        <div>
          <label className="label">Department</label>
          <select className="field sm" value={d.department_id} onChange={(e) => setD({ ...d, department_id: e.target.value })}>
            {deps.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name_en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">PDF page layout</label>
          <div className="grid grid-cols-2 gap-2">
            {(["portrait", "landscape"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setD({ ...d, orientation: o })}
                className={cx("btn btn-sm border capitalize", d.orientation === o ? "border-blue/40 bg-blue/10 text-blue" : "border-ink/10 bg-white/[0.06] text-ink-2")}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {d.id && (
          <div className="sm:col-span-2">
            <label className="label">Lock code {d.locked && <span className="font-normal text-warn">· locked</span>}</label>
            <input
              className="field sm"
              type="password"
              autoComplete="new-password"
              placeholder={d.locked ? "Type a new code to change it (leave empty to keep)" : "Not locked. Use the lock button in the list to lock it."}
              disabled={!d.locked}
              value={(d as Draft & { lock_code?: string }).lock_code ?? ""}
              onChange={(e) => setD({ ...d, lock_code: e.target.value } as Draft)}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="label">Report style</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              [undefined, "Automatic"],
              ["table", "One row per entry"],
              ["grid", "Items list (paper grid)"],
            ] as const).map(([v, l]) => (
              <button
                key={l}
                type="button"
                onClick={() => setD({ ...d, layout: v ?? null })}
                className={cx("btn btn-sm border", (d.layout ?? undefined) === v ? "border-blue/40 bg-blue/10 text-blue" : "border-ink/10 bg-white/[0.06] text-ink-2")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Icon</label>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
            {Object.keys(ICONS).map((name) => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => setD({ ...d, icon: name })}
                className={cx(
                  "grid aspect-square place-items-center rounded-xl transition-colors",
                  d.icon === name ? "text-white" : "bg-white/[0.06] text-ink-2 hover:bg-white/10",
                )}
                style={d.icon === name ? { background: d.color } : undefined}
              >
                <Icon name={name} className="h-[18px] w-[18px]" />
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setD({ ...d, color: c })}
                aria-label={c}
                className={cx("h-8 w-8 rounded-full transition-transform", d.color === c && "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[rgba(13,33,56,.25)]")}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">Fields staff fill in</label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setD({ ...d, fields: [...fields, blankField()] })}>
              <Plus className="h-4 w-4" /> Add field
            </button>
          </div>
          <p className="mb-3 text-[12px] text-ink-3">Date, day, time, shift, name and signature are added automatically.</p>
          <Reorder.Group axis="y" values={fields} onReorder={(f) => setD({ ...d, fields: f })} className="flex flex-col gap-2">
            {fields.map((f, i) => (
              <Reorder.Item key={f._k ?? f.key} value={f} className="rounded-2xl border border-ink/5 bg-white/[0.06] p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_130px_auto]">
                  <input className="field sm" placeholder="Label (English)" value={f.label_en} onChange={(e) => setField(i, { label_en: e.target.value })} />
                  <input className="field sm" dir="rtl" placeholder="الاسم بالعربي" value={f.label_ar} onChange={(e) => setField(i, { label_ar: e.target.value })} />
                  <select className="field sm" value={f.type} onChange={(e) => setField(i, { type: e.target.value as Field["type"] })}>
                    <option value="number">Number</option>
                    <option value="text">Text</option>
                    <option value="select">Choice</option>
                    <option value="yesno">Yes / No</option>
                    <option value="check">Item ✓ / ✗</option>
                    <option value="heading">Section heading</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm btn-icon"
                    onClick={() => setD({ ...d, fields: fields.filter((_, k) => k !== i) })}
                    disabled={fields.filter((x) => x.type !== "heading").length === 1 && f.type !== "heading"}
                    aria-label="Remove field"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {f.type === "number" && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <input className="field sm" placeholder="Unit (°C, %)" value={f.unit ?? ""} onChange={(e) => setField(i, { unit: e.target.value })} />
                    <input className="field sm" inputMode="decimal" placeholder="Normal min" value={f.min ?? ""} onChange={(e) => setField(i, { min: e.target.value === "" ? null : (e.target.value as unknown as number) })} />
                    <input className="field sm" inputMode="decimal" placeholder="Normal max" value={f.max ?? ""} onChange={(e) => setField(i, { max: e.target.value === "" ? null : (e.target.value as unknown as number) })} />
                  </div>
                )}
                {f.type === "select" && (
                  <input
                    className="field sm mt-2"
                    placeholder="Choices, separated by commas"
                    value={Array.isArray(f.options) ? f.options.join(", ") : ""}
                    onChange={(e) => setField(i, { options: e.target.value.split(",").map((s) => s.trimStart()) })}
                  />
                )}
                {f.type === "check" && (
                  <input className="field sm mt-2" placeholder="Quantity (e.g. 2 each) — optional" value={f.qty ?? ""} onChange={(e) => setField(i, { qty: e.target.value })} />
                )}
                {f.type !== "heading" && (
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                    <label className="flex items-center gap-2 text-[13px] text-ink-2">
                      <input type="checkbox" className="h-4 w-4 accent-[#1691d0]" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} />
                      Required
                    </label>
                    {(f.type === "check" || f.type === "yesno") && (
                      <label className="flex items-center gap-2 text-[13px] text-ink-2">
                        <input type="checkbox" className="h-4 w-4 accent-[#1691d0]" checked={!!f.photo} onChange={(e) => setField(i, { photo: e.target.checked })} />
                        Open the camera when ticked (photo is attached)
                      </label>
                    )}
                  </div>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Normal range note (printed under the table)</label>
          <input className="field sm" value={d.range_note} onChange={(e) => setD({ ...d, range_note: e.target.value })} placeholder="NORMAL RANGE: 2°C TO 8°C" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Footer (printed at the bottom of the PDF)</label>
          <input className="field sm" value={d.footer_note} onChange={(e) => setD({ ...d, footer_note: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
