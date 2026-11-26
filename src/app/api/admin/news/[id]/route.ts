import type { NextRequest } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { removeFiles } from "@/lib/media";
import { cleanPatch } from "@/lib/news";
import { store } from "@/lib/store";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/news/[id]">) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  const e = await store().get("news", id);
  if (!e) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(await store().update("news", id, cleanPatch(await req.json().catch(() => ({})), e)));
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/admin/news/[id]">) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  const e = await store().get("news", id);
  if (!e) return Response.json({ ok: true });
  await store().remove("news", id);
  await removeFiles([e.media_path, e.poster_path]).catch(() => {});
  return Response.json({ ok: true });
}
