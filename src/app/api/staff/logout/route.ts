import { destroyStaffSession } from "@/lib/auth";

export async function POST() {
  await destroyStaffSession();
  return Response.json({ ok: true });
}
