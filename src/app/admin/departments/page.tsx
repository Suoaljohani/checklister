"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { Icon, ICONS } from "@/components/icon";
import { Modal } from "@/components/modal";
import { EASE } from "@/components/motion";
import type { Department } from "@/lib/types";
import { cx, slugify } from "@/lib/utils";
import { useToast } from "../admin-shell";
import { api, PageTitle, useData } from "../use-data";

type Draft = Partial<Department>;

export default function DepartmentsPage() {
  const toast = useToast();
  const { data, reload, setData } = useData<Department[]>("/api/admin/departments");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState("");

  async function save() {
    if (!draft) return;
    setErr("");
    try {
      if (draft.id) await api(`/api/admin/departments/${draft.id}`, "PATCH", draft);
      else await api("/api/admin/departments", "POST", draft);
      toast(draft.id ? "Department saved" : "Department created");
      setDraft(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function toggle(d: Department) {
    setData((x) => x?.map((y) => (y.id === d.id ? { ...y, active: !d.active } : y)) ?? null);
    await api(`/api/admin/departments/${d.id}`, "PATCH", { active: !d.active }).catch(() => reload());
  }

  async function remove(d: Department) {
    if (!confirm(`Delete “${d.name_en}”, its checklists and ALL their records? This can’t be undone.`)) return;
    await api(`/api/admin/departments/${d.id}`, "DELETE");
    setData((x) => x?.filter((y) => y.id !== d.id) ?? null);
    toast("Department deleted");
  }

  return (
    <div>
      <PageTitle title="Departments" sub="Each department gets its own checklist page">
        <button
          className="btn btn-primary"
          onClick={() => {
            setErr("");
            setDraft({ name_en: "", name_ar: "", slug: "", icon: "Building2", sort: (data?.length ?? 0) + 1, active: true });
          }}
        >
          <Plus className="h-4 w-4" /> New department
        </button>
      </PageTitle>

      <div className="grid gap-3 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {data?.map((d) => (
            <motion.div
              key={d.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: EASE }}
              className={cx("glass flex items-center gap-4 p-4", !d.active && "opacity-60")}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky to-navy text-white">
                <Icon name={d.icon} className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{d.name_en}</p>
                <p className="truncate text-[13px] text-ink-3">
                  {d.name_ar} · <span className="num">/d/{d.slug}</span>
                </p>
              </div>
              <Link href={`/d/${d.slug}`} target="_blank" className="btn btn-ghost btn-sm btn-icon" aria-label="Open staff page">
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => toggle(d)} aria-label={d.active ? "Hide" : "Show"}>
                {d.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => {
                  setErr("");
                  setDraft(d);
                }}
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(d)} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit department" : "New department"}
        footer={
          <>
            {err && <p className="mr-auto self-center text-[13px] text-danger">{err}</p>}
            <button className="btn btn-ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save}>
              Save
            </button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Name (English)</label>
              <input
                className="field sm"
                value={draft.name_en ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, name_en: e.target.value, slug: draft.id ? draft.slug : slugify(e.target.value).slice(0, 30) })
                }
              />
            </div>
            <div>
              <label className="label">Name (Arabic)</label>
              <input className="field sm" dir="rtl" value={draft.name_ar ?? ""} onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })} />
            </div>
            <div>
              <label className="label">Link name</label>
              <div className="flex items-center gap-2">
                <span className="num text-[14px] text-ink-3">/d/</span>
                <input className="field sm num" value={draft.slug ?? ""} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Icon</label>
              <div className="grid grid-cols-8 gap-1.5">
                {Object.keys(ICONS).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setDraft({ ...draft, icon: name })}
                    className={cx("grid aspect-square place-items-center rounded-xl", draft.icon === name ? "bg-blue text-white" : "bg-white/[0.06] text-ink-2 hover:bg-white/10")}
                  >
                    <Icon name={name} className="h-[18px] w-[18px]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
