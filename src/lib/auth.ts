import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { store } from "./store";

const COOKIE = "chk_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function secret() {
  return process.env.SESSION_SECRET || `chk:${process.env.ADMIN_PASSWORD || "local-dev-secret"}`;
}

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 32).toString("hex")}`;
}

function verifyHash(pw: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const a = Buffer.from(hex, "hex");
  const b = scryptSync(pw, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Password set from the admin Settings page wins; otherwise ADMIN_PASSWORD from the environment. */
export async function checkPassword(pw: string) {
  const settings = await store().getSettings();
  if (settings.admin_password_hash) return verifyHash(pw, settings.admin_password_hash);
  const envPw = process.env.ADMIN_PASSWORD;
  if (!envPw) return false;
  return safeEqual(pw, envPw);
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function createSession() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const token = `${exp}.${sign(String(exp))}`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) * 1000 > Date.now();
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function verifyPassword(pw: string, stored: string | undefined) {
  return !!stored && verifyHash(pw, stored);
}

/* ---------------- Staff sign-in (employee accounts) ---------------- */

const STAFF_COOKIE = "chk_staff";
const STAFF_AGE = 60 * 60 * 14; // one long shift

const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export async function createStaffSession(employeeId: string) {
  const exp = Math.floor(Date.now() / 1000) + STAFF_AGE;
  const body = `${employeeId}.${exp}`;
  (await cookies()).set(STAFF_COOKIE, `${body}.${sign(`staff:${body}`)}`, cookieOpts(STAFF_AGE));
}

export async function destroyStaffSession() {
  (await cookies()).delete(STAFF_COOKIE);
}

/** The signed-in employee, if the cookie is valid and the account is still active. */
export async function currentEmployee() {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (!token) return null;
  const i = token.lastIndexOf(".");
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!body || !sig || !safeEqual(sig, sign(`staff:${body}`))) return null;
  const j = body.lastIndexOf(".");
  const id = body.slice(0, j);
  if (Number(body.slice(j + 1)) * 1000 < Date.now()) return null;
  const e = await store().get("employees", id);
  return e && e.active ? e : null;
}

/** Accounts are required once at least one active employee exists. */
export async function accountsRequired() {
  try {
    return (await store().list("employees")).some((e) => e.active);
  } catch {
    return false; // employees table not created yet (migration 0004 not run)
  }
}

/* ---------------- Locked checklists ----------------
 * A locked checklist asks the signed-in employee for their own account password every time it is opened.
 * The server then hands back a short-lived token that lives only in the page's memory (not a cookie),
 * so leaving the page means entering the password again. The token names the employee who unlocked it.
 */

const UNLOCK_AGE = 60 * 30; // long enough to fill in a long list
const unlockSig = (checklistId: string, employeeId: string, exp: string) => sign(`unlock:${checklistId}:${employeeId}:${exp}`);

export function isLocked(c: { lock_hash?: string }) {
  return !!c.lock_hash;
}

export function issueUnlockToken(checklistId: string, employeeId: string) {
  const exp = String(Math.floor(Date.now() / 1000) + UNLOCK_AGE);
  return `${employeeId}~${exp}~${unlockSig(checklistId, employeeId, exp)}`;
}

/** The employee id inside a valid token for this checklist, or null. */
export function readUnlockToken(checklistId: string, token: string | null | undefined) {
  if (!token) return null;
  const [employeeId, exp, sig] = token.split("~");
  if (!employeeId || !exp || !sig || Number(exp) * 1000 < Date.now()) return null;
  return safeEqual(sig, unlockSig(checklistId, employeeId, exp)) ? employeeId : null;
}

/* Simple per-IP throttle for code and password guesses. */
const tries = new Map<string, { n: number; at: number }>();
export function throttle(req: Request, scope: string) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const k = `${scope}:${ip}`;
  const a = tries.get(k);
  const fresh = a && Date.now() - a.at < 5 * 60e3;
  return {
    blocked: !!fresh && a!.n >= 8,
    fail: () => tries.set(k, { n: (fresh ? a!.n : 0) + 1, at: Date.now() }),
    ok: () => tries.delete(k),
  };
}
