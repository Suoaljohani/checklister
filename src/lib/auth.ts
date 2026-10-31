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
