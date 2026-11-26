import { promises as fs } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { isMediaPath, LOCAL_DIR, mediaBackend } from "@/lib/media";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };

/** Local/demo only: serves uploaded files, with byte ranges so phones can play and seek videos. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/media/[...path]">) {
  if (mediaBackend() !== "local") return new Response("Not found", { status: 404 });
  const p = (await ctx.params).path.join("/");
  if (!isMediaPath(p)) return new Response("Not found", { status: 404 });
  const buf = await fs.readFile(path.join(LOCAL_DIR, p)).catch(() => null);
  if (!buf) return new Response("Not found", { status: 404 });
  const type = TYPES[p.split(".").pop()!] ?? "application/octet-stream";
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), buf.length - 1) : buf.length - 1;
    return new Response(new Uint8Array(buf.subarray(start, end + 1)), {
      status: 206,
      headers: { "content-type": type, "content-range": `bytes ${start}-${end}/${buf.length}`, "accept-ranges": "bytes", "content-length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(buf), { headers: { "content-type": type, "accept-ranges": "bytes", "content-length": String(buf.length) } });
}
