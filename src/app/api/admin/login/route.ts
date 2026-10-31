import { checkPassword, createSession } from "@/lib/auth";

const attempts = new Map<string, { n: number; at: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const a = attempts.get(ip);
  if (a && a.n >= 8 && Date.now() - a.at < 5 * 60e3)
    return Response.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !(await checkPassword(password))) {
    attempts.set(ip, { n: (a && Date.now() - a.at < 5 * 60e3 ? a.n : 0) + 1, at: Date.now() });
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }
  attempts.delete(ip);
  await createSession();
  return Response.json({ ok: true });
}
