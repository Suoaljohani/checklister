import { connection } from "next/server";
import { accountsRequired, currentEmployee } from "@/lib/auth";

/** accounts: staff must sign in. open: staff type their name (no accounts set up yet). */
export async function GET() {
  await connection();
  const accounts = await accountsRequired();
  const e = accounts ? await currentEmployee() : null;
  return Response.json({
    mode: accounts ? "accounts" : "open",
    staff: e ? { name: e.name, no: e.employee_no, job_title: e.job_title } : null,
  });
}
