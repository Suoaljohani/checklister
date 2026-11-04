import { connection, type NextRequest } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { store } from "@/lib/store";
import { sanitize, isEntity, toClient } from "@/lib/entities";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/[entity]">) {
  await connection();
  if (!(await isAdmin())) return unauthorized();
  const { entity } = await ctx.params;
  if (!isEntity(entity)) return Response.json({ error: "Not found" }, { status: 404 });
  if (entity === "submissions") {
    const p = req.nextUrl.searchParams;
    const rows = await store().submissions({
      checklist_id: p.get("checklist") || undefined,
      department_id: p.get("department") || undefined,
      from: p.get("from") || undefined,
      to: p.get("to") || undefined,
      withSignature: p.get("signatures") === "1",
      limit: Number(p.get("limit")) || 2000,
    });
    return Response.json(rows);
  }
  return Response.json((await store().list(entity)).map(toClient));
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/[entity]">) {
  if (!(await isAdmin())) return unauthorized();
  const { entity } = await ctx.params;
  if (!isEntity(entity) || entity === "submissions") return Response.json({ error: "Not allowed" }, { status: 400 });
  const result = sanitize(entity, await req.json(), null);
  if ("error" in result) return Response.json(result, { status: 400 });
  if (entity === "departments") {
    const clash = (await store().list("departments")).some((d) => d.slug === (result.row as { slug: string }).slug);
    if (clash) return Response.json({ error: "That link name is already used by another department" }, { status: 400 });
  }
  if (entity === "employees") {
    const no = (result.row as { employee_no: string }).employee_no;
    if ((await store().list("employees")).some((e) => e.employee_no === no))
      return Response.json({ error: "Another employee already has that number" }, { status: 400 });
  }
  return Response.json(toClient(await store().insert(entity, result.row as never)));
}
