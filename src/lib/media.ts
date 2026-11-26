import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { backend } from "./store";

/*
 * Photos and videos for the news feed.
 * - Live site: a private Supabase Storage bucket. The admin's browser uploads straight to it with a
 *   one-time signed upload link (so big videos never pass through the app server), and staff get
 *   signed view links that expire.
 * - Local / demo: files on disk under .data/media, served by /api/media.
 */

export const BUCKET = "news";
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const VIEW_SECONDS = 60 * 60 * 6;

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_PUBLIC_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SB_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const LOCAL_DIR = path.join(process.env.VERCEL ? "/tmp" : path.join(process.cwd(), ".data"), "media");

export function mediaBackend(): "supabase" | "local" {
  return backend() === "supabase" && SB_URL && SB_SERVICE_KEY ? "supabase" : "local";
}

const g = globalThis as unknown as { __media?: SupabaseClient };
function sb() {
  g.__media ??= createClient(SB_URL!, SB_SERVICE_KEY!, { auth: { persistSession: false } });
  return g.__media;
}

/** Paths look like news/<random>.<ext>; anything else is refused. */
export function isMediaPath(p: unknown): p is string {
  return typeof p === "string" && /^news\/[a-z0-9-]{8,64}\.(jpg|png|webp|mp4|webm|mov)$/.test(p);
}

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function extFor(contentType: string) {
  return ALLOWED[contentType] ?? null;
}

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const { error } = await sb().storage.getBucket(BUCKET);
  if (error) {
    const made = await sb().storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_VIDEO_BYTES,
      allowedMimeTypes: Object.keys(ALLOWED),
    });
    if (made.error && !/exists/i.test(made.error.message)) throw new Error(`storage bucket: ${made.error.message}`);
  }
  bucketReady = true;
}

export type UploadTarget = { path: string; url: string; method: "PUT"; headers: Record<string, string> };

/** A one-time place for the browser to upload one file to. */
export async function createUpload(contentType: string): Promise<UploadTarget> {
  const ext = extFor(contentType);
  if (!ext) throw new Error("This file type is not supported");
  const p = `news/${crypto.randomUUID()}.${ext}`;
  if (mediaBackend() === "local") {
    return { path: p, url: `/api/admin/news/local-upload?path=${encodeURIComponent(p)}`, method: "PUT", headers: { "content-type": contentType } };
  }
  await ensureBucket();
  const { data, error } = await sb().storage.from(BUCKET).createSignedUploadUrl(p.slice(BUCKET.length + 1));
  if (error || !data) throw new Error(`storage upload link: ${error?.message ?? "unknown"}`);
  // Same request the Supabase client sends for a raw (non-form) upload to a signed URL.
  return {
    path: p,
    url: data.signedUrl,
    method: "PUT",
    headers: {
      "content-type": contentType,
      "cache-control": "max-age=31536000",
      "x-upsert": "false",
      ...(SB_PUBLIC_KEY ? { apikey: SB_PUBLIC_KEY } : {}),
    },
  };
}

/** Signed (live) or local links to view files, keyed by path. */
export async function viewUrls(paths: string[]): Promise<Record<string, string>> {
  const list = [...new Set(paths.filter(isMediaPath))];
  if (!list.length) return {};
  if (mediaBackend() === "local") return Object.fromEntries(list.map((p) => [p, `/api/media/${p}`]));
  const { data, error } = await sb()
    .storage.from(BUCKET)
    .createSignedUrls(
      list.map((p) => p.slice(BUCKET.length + 1)),
      VIEW_SECONDS,
    );
  if (error || !data) return {};
  const out: Record<string, string> = {};
  data.forEach((d, i) => {
    if (d.signedUrl) out[list[i]] = d.signedUrl;
  });
  return out;
}

/** Whether an uploaded file is really there (so posts can't point at nothing). */
export async function exists(p: string) {
  if (!isMediaPath(p)) return false;
  if (mediaBackend() === "local") return fs.stat(path.join(LOCAL_DIR, p)).then(() => true, () => false);
  const name = p.slice(BUCKET.length + 1);
  const { data } = await sb().storage.from(BUCKET).list("", { search: name, limit: 1 });
  return !!data?.some((f) => f.name === name);
}

export async function removeFiles(paths: string[]) {
  const list = paths.filter(isMediaPath);
  if (!list.length) return;
  if (mediaBackend() === "local") {
    await Promise.all(list.map((p) => fs.rm(path.join(LOCAL_DIR, p), { force: true })));
    return;
  }
  await sb().storage.from(BUCKET).remove(list.map((p) => p.slice(BUCKET.length + 1)));
}
