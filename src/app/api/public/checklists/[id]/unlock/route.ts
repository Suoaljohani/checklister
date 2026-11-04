import type { NextRequest } from "next/server";
import { grantUnlock, throttle, verifyPassword } from "@/lib/auth";
import { store } from "@/lib/store";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/public/checklists/[id]/unlock">) {
  const { id } = await ctx.params;
  const t = throttle(req, `unlock:${id}`);
  if (t.blocked) return Response.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  const checklist = await store().get("checklists", id);
  if (!checklist || !checklist.active) return Response.json({ error: "Not found" }, { status: 404 });
  if (!checklist.lock_hash) return Response.json({ ok: true });
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  if (!code || !verifyPassword(String(code).trim(), checklist.lock_hash)) {
    t.fail();
    return Response.json({ error: "Wrong code" }, { status: 401 });
  }
  t.ok();
  await grantUnlock(checklist.id, checklist.lock_hash);
  return Response.json({ ok: true });
}
