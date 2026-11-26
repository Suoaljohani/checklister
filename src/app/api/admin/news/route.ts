import { connection } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { exists } from "@/lib/media";
import { cleanNew, listNews } from "@/lib/news";
import { store } from "@/lib/store";

export async function GET() {
  await connection();
  if (!(await isAdmin())) return unauthorized();
  return Response.json(await listNews(false));
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const result = cleanNew(await req.json().catch(() => ({})));
  if ("error" in result) return Response.json(result, { status: 400 });
  const r = result.row;
  for (const p of [r.media_path, r.poster_path].filter(Boolean))
    if (!(await exists(p))) return Response.json({ error: "The upload didn't finish. Please try again." }, { status: 400 });
  try {
    return Response.json(await store().insert("news", r));
  } catch (e) {
    const msg = String((e as Error).message);
    if (/unknown table|news/i.test(msg)) return Response.json({ error: "The news table is not set up yet (database update 0006)." }, { status: 500 });
    throw e;
  }
}
