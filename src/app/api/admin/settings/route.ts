import { connection } from "next/server";
import { hashPassword, isAdmin, unauthorized } from "@/lib/auth";
import { store } from "@/lib/store";
import type { Settings } from "@/lib/types";

export async function GET() {
  await connection();
  const s = await store().getSettings();
  return Response.json({ header_en: s.header_en, header_ar: s.header_ar, copyright_owner: s.copyright_owner, timezone: s.timezone });
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const body = (await req.json()) as Partial<Settings> & { new_password?: string };
  const cur = await store().getSettings();
  const lines = (v: unknown, fallback: string[]) =>
    Array.isArray(v) ? v.map((x) => String(x).slice(0, 120)).filter(Boolean).slice(0, 6) : fallback;
  const next: Settings = {
    ...cur,
    header_en: lines(body.header_en, cur.header_en),
    header_ar: lines(body.header_ar, cur.header_ar),
    copyright_owner: body.copyright_owner ? String(body.copyright_owner).slice(0, 60) : cur.copyright_owner,
  };
  if (body.new_password) {
    if (body.new_password.length < 6) return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    next.admin_password_hash = hashPassword(body.new_password);
  }
  await store().putSettings(next);
  return Response.json({ ok: true });
}
