/** check = item present ✓ / missing ✗; heading = section title only (no value). */
export type FieldType = "number" | "text" | "select" | "yesno" | "check" | "heading";

export type Field = {
  key: string;
  label_en: string;
  label_ar: string;
  type: FieldType;
  unit?: string;
  min?: number | null;
  max?: number | null;
  required: boolean;
  options?: string[];
  /** Expected quantity printed next to the item, e.g. "2 each". */
  qty?: string;
  /** check / yesno: open the camera when ticked and attach the photo. */
  photo?: boolean;
};

export type Department = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  icon: string;
  sort: number;
  active: boolean;
  created_at: string;
};

export type Checklist = {
  id: string;
  department_id: string;
  title_en: string;
  title_ar: string;
  icon: string;
  color: string;
  fields: Field[];
  range_note: string;
  footer_note: string;
  orientation: "portrait" | "landscape";
  /** Report style. table = one row per entry; grid = items down the side, entries across (like the paper forms). */
  layout?: "table" | "grid" | null;
  sort: number;
  active: boolean;
  created_at: string;
};

export type FieldValue = string | number | boolean | null;

export type Submission = {
  id: string;
  checklist_id: string;
  department_id: string;
  employee_name: string;
  employee_no: string;
  submitted_at: string;
  values: Record<string, FieldValue>;
  signature: string;
  /** Photos taken for fields, keyed by field key (JPEG data URLs). Left out of list views. */
  photos?: Record<string, string>;
  flagged: boolean;
  note: string;
};

export type Settings = {
  header_en: string[];
  header_ar: string[];
  copyright_owner: string;
  timezone: string;
  admin_password_hash?: string;
};

export type EntityName = "departments" | "checklists" | "submissions";

export type Stats = {
  generated_at: string;
  totals: { today: number; week: number; month: number; all: number; flagged_month: number };
  compliance_today: { done: number; expected: number };
  trend: { date: string; count: number; flagged: number }[];
  per_checklist: {
    id: string;
    title_en: string;
    title_ar: string;
    icon: string;
    color: string;
    department: string;
    done_today: boolean;
    month_count: number;
    last_at: string | null;
    series: { at: string; value: number | null }[];
    primary_label: string;
    primary_unit: string;
    min: number | null;
    max: number | null;
  }[];
  recent: {
    id: string;
    checklist: string;
    icon: string;
    color: string;
    employee_name: string;
    submitted_at: string;
    flagged: boolean;
    summary: string;
  }[];
  top_staff: { name: string; count: number }[];
};
