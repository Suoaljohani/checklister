import { store } from "@/lib/store";
import type { FieldValue, Submission } from "@/lib/types";
import { isFlagged, uid } from "@/lib/utils";

const MAX_SIGNATURE = 400_000;
const MAX_PHOTO = 900_000;

export async function POST(req: Request) {
  let body: {
    checklist_id?: string;
    employee_name?: string;
    employee_no?: string;
    values?: Record<string, FieldValue>;
    signature?: string;
    photos?: Record<string, string>;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const s = store();
  const checklist = body.checklist_id ? await s.get("checklists", body.checklist_id) : null;
  if (!checklist || !checklist.active) return Response.json({ error: "Checklist not found" }, { status: 404 });

  const name = (body.employee_name ?? "").trim().slice(0, 80);
  if (!name) return Response.json({ error: "Please enter your name" }, { status: 400 });
  const sig = body.signature ?? "";
  if (!sig.startsWith("data:image/png;base64,") || sig.length > MAX_SIGNATURE)
    return Response.json({ error: "A signature is required" }, { status: 400 });

  const values: Record<string, FieldValue> = {};
  const photos: Record<string, string> = {};
  for (const f of checklist.fields) {
    if (f.type === "heading") continue;
    let v = body.values?.[f.key] ?? null;
    if (f.type === "number" && v !== null && v !== "") {
      const n = Number(v);
      if (Number.isNaN(n)) return Response.json({ error: `${f.label_en} must be a number` }, { status: 400 });
      v = n;
    } else if (f.type === "yesno" || f.type === "check") {
      v = v === null ? null : Boolean(v);
    } else if (v !== null) {
      v = String(v).slice(0, 500);
    }
    if (f.required && (v === null || v === "")) return Response.json({ error: `${f.label_en} is required` }, { status: 400 });
    values[f.key] = v;
    if (f.photo && v === true) {
      const ph = body.photos?.[f.key] ?? "";
      if (!ph.startsWith("data:image/jpeg;base64,") || ph.length > MAX_PHOTO)
        return Response.json({ error: `Please take a photo for ${f.label_en}` }, { status: 400 });
      photos[f.key] = ph;
    }
  }

  const row: Submission = {
    id: uid(),
    checklist_id: checklist.id,
    department_id: checklist.department_id,
    employee_name: name,
    employee_no: (body.employee_no ?? "").trim().slice(0, 30),
    submitted_at: new Date().toISOString(),
    values,
    signature: sig,
    ...(Object.keys(photos).length ? { photos } : {}),
    flagged: isFlagged(checklist, values),
    note: (body.note ?? "").trim().slice(0, 500),
  };
  await s.insert("submissions", row);
  return Response.json({ ok: true, id: row.id, submitted_at: row.submitted_at, flagged: row.flagged });
}
