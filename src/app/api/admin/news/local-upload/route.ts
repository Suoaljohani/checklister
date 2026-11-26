import { promises as fs } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { isMediaPath, LOCAL_DIR, MAX_VIDEO_BYTES, mediaBackend } from "@/lib/media";

/** Local/demo only: receives an upload and saves it to disk. The live site uploads to Supabase Storage. */
export async function PUT(req: NextRequest) {
  if (mediaBackend() !== "local") return Response.json({ error: "Not available" }, { status: 404 });
  if (!(await isAdmin())) return unauthorized();
  const p = req.nextUrl.searchParams.get("path");
  if (!isMediaPath(p)) return Response.json({ error: "Bad path" }, { status: 400 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length || buf.length > MAX_VIDEO_BYTES) return Response.json({ error: "Bad size" }, { status: 400 });
  const file = path.join(LOCAL_DIR, p);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buf);
  return Response.json({ ok: true });
}
