import { hashPassword } from "./auth";
import type { Checklist, Department, Employee, EntityName, Field, FieldValue, Submission } from "./types";
import { slugify, uid } from "./utils";

export function isEntity(e: string): e is EntityName {
  return e === "departments" || e === "checklists" || e === "submissions" || e === "employees";
}

type In = Record<string, unknown>;
type Out = { row: Partial<Department | Checklist | Submission | Employee> } | { error: string };

const str = (v: unknown, max = 200) => (v === undefined || v === null ? "" : String(v).trim().slice(0, max));
const num = (v: unknown) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

function fields(v: unknown): Field[] | string {
  if (!Array.isArray(v) || !v.some((f) => (f as In)?.type !== "heading")) return "Add at least one field";
  const seen = new Set<string>();
  const out: Field[] = [];
  for (const raw of v.slice(0, 120) as In[]) {
    const label_en = str(raw.label_en, 100);
    if (!label_en) return "Every field needs an English label";
    let key = slugify(str(raw.key, 40) || label_en.slice(0, 40)).replace(/-/g, "_") || uid("f").slice(0, 8);
    while (seen.has(key)) key += "_2";
    seen.add(key);
    const type = (["number", "text", "select", "yesno", "check", "heading"].includes(raw.type as string) ? raw.type : "text") as Field["type"];
    out.push({
      key,
      label_en,
      label_ar: str(raw.label_ar, 100),
      type,
      unit: type === "number" ? str(raw.unit, 10) : undefined,
      min: type === "number" ? num(raw.min) : undefined,
      max: type === "number" ? num(raw.max) : undefined,
      required: type === "heading" ? false : Boolean(raw.required),
      qty: str(raw.qty, 20) || undefined,
      photo: (type === "check" || type === "yesno") && raw.photo ? true : undefined,
      options:
        type === "select"
          ? (Array.isArray(raw.options) ? raw.options : str(raw.options, 500).split(","))
              .map((o) => str(o, 40))
              .filter(Boolean)
          : undefined,
    });
  }
  return out;
}

export function sanitize(entity: EntityName, b: In, existing: Department | Checklist | Submission | Employee | null): Out {
  const now = new Date().toISOString();
  if (entity === "departments") {
    const e = existing as Department | null;
    const name_en = str(b.name_en ?? e?.name_en, 80);
    if (!name_en) return { error: "Department name is required" };
    const slug = slugify(str(b.slug ?? e?.slug, 40) || name_en);
    if (!slug) return { error: "Link name must use English letters or numbers" };
    return {
      row: {
        id: e?.id ?? uid("dep"),
        slug,
        name_en,
        name_ar: str(b.name_ar ?? e?.name_ar, 80),
        icon: str(b.icon ?? e?.icon, 40) || "Building2",
        sort: num(b.sort ?? e?.sort) ?? 0,
        active: b.active === undefined ? (e?.active ?? true) : Boolean(b.active),
        created_at: e?.created_at ?? now,
      },
    };
  }
  if (entity === "checklists") {
    const e = existing as Checklist | null;
    const title_en = str(b.title_en ?? e?.title_en, 140);
    if (!title_en) return { error: "Checklist title is required" };
    const department_id = str(b.department_id ?? e?.department_id, 80);
    if (!department_id) return { error: "Choose a department" };
    const f = fields(b.fields ?? e?.fields);
    if (typeof f === "string") return { error: f };
    // Locked = staff must enter their own account password each time they open it.
    // Stored in the lock_hash column as a non-empty marker (no shared code any more).
    const lock_hash = b.locked === undefined ? (e?.lock_hash ? "staff" : "") : b.locked ? "staff" : "";
    return {
      row: {
        id: e?.id ?? uid("chk"),
        department_id,
        title_en,
        title_ar: str(b.title_ar ?? e?.title_ar, 140),
        icon: str(b.icon ?? e?.icon, 40) || "ClipboardCheck",
        color: /^#[0-9a-f]{6}$/i.test(str(b.color)) ? str(b.color) : (e?.color ?? "#1691D0"),
        fields: f,
        range_note: str(b.range_note ?? e?.range_note, 240),
        footer_note: str(b.footer_note ?? e?.footer_note, 120),
        orientation: (b.orientation ?? e?.orientation) === "landscape" ? "landscape" : "portrait",
        lock_hash,
        layout: ((l) => (l === "grid" || l === "table" ? l : null))(b.layout === undefined ? e?.layout : b.layout),
        sort: num(b.sort ?? e?.sort) ?? 0,
        active: b.active === undefined ? (e?.active ?? true) : Boolean(b.active),
        created_at: e?.created_at ?? now,
      },
    };
  }
  if (entity === "employees") {
    const e = existing as Employee | null;
    const name = str(b.name ?? e?.name, 80);
    if (!name) return { error: "Name is required" };
    const employee_no = str(b.employee_no ?? e?.employee_no, 30).replace(/\s+/g, "");
    if (!employee_no) return { error: "Employee number is required" };
    const pw = b.password === undefined || b.password === null ? "" : String(b.password);
    if (!e && pw.length < 4) return { error: "Password needs at least 4 characters" };
    if (pw && pw.length < 4) return { error: "Password needs at least 4 characters" };
    return {
      row: {
        id: e?.id ?? uid("emp"),
        name,
        name_ar: str(b.name_ar ?? e?.name_ar, 80),
        employee_no,
        job_title: str(b.job_title ?? e?.job_title, 60),
        password_hash: pw ? hashPassword(pw.slice(0, 100)) : e?.password_hash,
        active: b.active === undefined ? (e?.active ?? true) : Boolean(b.active),
        sort: num(b.sort ?? e?.sort) ?? 0,
        created_at: e?.created_at ?? now,
      },
    };
  }

  // submissions: admin may correct values / name / note only
  const e = existing as Submission | null;
  if (!e) return { error: "Records are created by staff from the checklist page" };
  const values = { ...e.values };
  if (b.values && typeof b.values === "object") {
    for (const [k, v] of Object.entries(b.values as Record<string, FieldValue>)) {
      const wasNumber = typeof e.values[k] === "number";
      values[k] = wasNumber && typeof v === "string" && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : v;
    }
  }
  return {
    row: {
      employee_name: str(b.employee_name ?? e.employee_name, 80) || e.employee_name,
      employee_no: str(b.employee_no ?? e.employee_no, 30),
      note: str(b.note ?? e.note, 500),
      values,
    },
  };
}

/** Remove secrets before a row goes to the browser. */
export function toClient<T>(row: T): T {
  if (!row || typeof row !== "object") return row;
  const r = { ...(row as Record<string, unknown>) };
  if ("lock_hash" in r) {
    r.locked = !!r.lock_hash;
    delete r.lock_hash;
  }
  if ("password_hash" in r) {
    r.has_password = !!r.password_hash;
    delete r.password_hash;
  }
  return r as T;
}
