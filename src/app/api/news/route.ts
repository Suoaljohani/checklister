import { connection, type NextRequest } from "next/server";
import { listNews } from "@/lib/news";

/** Staff news feed. ?meta=1 returns only the newest post time (for the "new" badge). */
export async function GET(req: NextRequest) {
  await connection();
  const posts = await listNews(true);
  const headers = { "cache-control": "no-store" };
  if (req.nextUrl.searchParams.get("meta") === "1")
    return Response.json({ latest: posts.reduce((m, p) => (p.created_at > m ? p.created_at : m), ""), count: posts.length }, { headers });
  return Response.json({ posts }, { headers });
}
