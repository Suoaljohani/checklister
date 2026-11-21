import { accountsRequired, currentEmployee, isLocked, readUnlockToken, serverNow } from "@/lib/auth";
import { nextShift, openShift, SHIFT_NAMES, shiftsOf } from "@/lib/shifts";
import { store } from "@/lib/store";
import type { Employee, FieldValue, ShiftCode, Submission } from "@/lib/types";
import { isFlagged, uid, zoned } from "@/lib/utils";

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
    unlock?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const s = store();
  const checklist = body.checklist_id ? await s.get("checklists", body.checklist_id) : null;
  if (!checklist || !checklist.active) return Response.json({ error: "Checklist not found" }, { status: 404 });

  // Locked checklists: the record belongs to the employee who entered their password to open it.
  let unlockedBy: string | null = null;
  if (isLocked(checklist)) {
    unlockedBy = readUnlockToken(checklist.id, body.unlock);
    if (!unlockedBy) return Response.json({ error: "This checklist is locked. Enter your password again.", locked: true }, { status: 403 });
  }

  // With staff accounts, the name comes from the account, not the form.
  let name = (body.employee_name ?? "").trim().slice(0, 80);
  let employeeNo = (body.employee_no ?? "").trim().slice(0, 30);
  let employee: Employee | null = null;
  if (unlockedBy || (await accountsRequired())) {
    const signedIn = await currentEmployee();
    const e = unlockedBy ? (signedIn?.id === unlockedBy ? signedIn : null) : signedIn;
    if (!e) return Response.json({ error: "Please sign in again", signin: true }, { status: 401 });
    name = e.name;
    employeeNo = e.employee_no;
    employee = e;
  }
  if (!name) return Response.json({ error: "Please enter your name" }, { status: 400 });
  const sig = body.signature ?? "";
  if (!sig.startsWith("data:image/png;base64,") || sig.length > MAX_SIGNATURE)
    return Response.json({ error: "A signature is required" }, { status: 400 });

  // Shift-controlled checklists: open window, employee permission, one check per shift.
  const now = serverNow(req);
  let shift: { code: ShiftCode; date: string } | null = null;
  const windows = shiftsOf(checklist);
  if (windows) {
    const open = openShift(windows, now);
    if (!open) {
      const nx = nextShift(windows, now);
      return Response.json(
        {
          error: nx ? `Outside check time. Next check: ${SHIFT_NAMES[nx.code].en} at ${nx.start}` : "Outside check time",
          error_ar: nx ? `خارج وقت التشييك. الموعد التالي: ${SHIFT_NAMES[nx.code].ar} الساعة ${nx.start}` : "خارج وقت التشييك",
          outside: true,
        },
        { status: 422 },
      );
    }
    if (employee?.allowed_shifts && !employee.allowed_shifts.includes(open.window.code))
      return Response.json(
        { error: "This shift is not allowed for your account", error_ar: "هذا الشفت غير مسموح لحسابك", not_allowed: true },
        { status: 403 },
      );
    shift = { code: open.window.code, date: open.date };
    const dup = await findShiftCheck(checklist.id, shift, now);
    if (dup) return dupResponse(dup);
  }

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
    employee_no: employeeNo,
    submitted_at: now.toISOString(),
    ...(shift ? { shift_code: shift.code, shift_date: shift.date } : {}),
    values,
    signature: sig,
    ...(Object.keys(photos).length ? { photos } : {}),
    flagged: isFlagged(checklist, values),
    note: (body.note ?? "").trim().slice(0, 500),
  };
  try {
    await s.insert("submissions", row);
  } catch (e) {
    // Two phones at the same moment: the unique index lets only one through.
    if (shift && /duplicate key|unique|submissions_one_per_shift/i.test(String((e as Error).message))) {
      const dup = await findShiftCheck(checklist.id, shift, now);
      if (dup) return dupResponse(dup);
    }
    throw e;
  }
  return Response.json({ ok: true, id: row.id, submitted_at: row.submitted_at, flagged: row.flagged });
}

async function findShiftCheck(checklistId: string, shift: { code: ShiftCode; date: string }, now: Date) {
  const recent = await store().submissions({ checklist_id: checklistId, from: new Date(now.getTime() - 3 * 86400e3).toISOString() });
  return recent.find((x) => x.shift_code === shift.code && x.shift_date === shift.date) ?? null;
}

function dupResponse(dup: Submission) {
  const t = zoned(dup.submitted_at).time;
  return Response.json(
    {
      error: `Already checked by ${dup.employee_name} at ${t}`,
      error_ar: `تم التشييك بواسطة ${dup.employee_name} الساعة ${t}`,
      duplicate: true,
      by: dup.employee_name,
      at: dup.submitted_at,
    },
    { status: 409 },
  );
}
