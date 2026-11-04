import type { NextRequest } from "next/server";
import { currentEmployee, isLocked, issueUnlockToken, throttle, verifyPassword } from "@/lib/auth";
import { store } from "@/lib/store";

/** The signed-in employee re-enters their own password to open a locked checklist. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/public/checklists/[id]/unlock">) {
  const { id } = await ctx.params;
  const checklist = await store().get("checklists", id);
  if (!checklist || !checklist.active) return Response.json({ error: "Not found" }, { status: 404 });
  if (!isLocked(checklist)) return Response.json({ token: "" });
  const e = await currentEmployee();
  if (!e) return Response.json({ error: "Please sign in with your staff account first", signin: true }, { status: 401 });
  const t = throttle(req, `unlock:${e.id}`);
  if (t.blocked) return Response.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !verifyPassword(String(password), e.password_hash)) {
    t.fail();
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }
  t.ok();
  return Response.json({ token: issueUnlockToken(checklist.id, e.id) });
}
