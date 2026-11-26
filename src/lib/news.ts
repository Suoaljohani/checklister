import "server-only";
import { isMediaPath, viewUrls } from "./media";
import { store } from "./store";
import type { NewsPost } from "./types";
import { uid } from "./utils";

export type NewsView = NewsPost & { media_url: string; poster_url: string };

const COLORS = ["#0f766e", "#1691D0", "#283A83", "#7A5AF8", "#E0475B", "#04A67A", "#E9A23B"];

/** Pinned first, then newest. */
export function order(list: NewsPost[]) {
  return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.created_at < b.created_at ? 1 : -1));
}

/** All posts (or only visible ones) with links to their files. Empty if the news table doesn't exist yet. */
export async function listNews(onlyActive: boolean): Promise<NewsView[]> {
  let rows: NewsPost[] = [];
  try {
    rows = await store().list("news");
  } catch {
    return [];
  }
  const list = order(onlyActive ? rows.filter((r) => r.active) : rows);
  const urls = await viewUrls(list.flatMap((r) => [r.media_path, r.poster_path]));
  return list.map((r) => ({ ...r, media_url: urls[r.media_path] ?? "", poster_url: urls[r.poster_path] ?? "" }));
}

const str = (v: unknown, max: number) => (v === undefined || v === null ? "" : String(v).trim().slice(0, max));

export function cleanNew(b: Record<string, unknown>): { row: NewsPost } | { error: string } {
  const kind = b.kind === "image" || b.kind === "video" || b.kind === "text" ? b.kind : null;
  if (!kind) return { error: "Choose a photo, a video or text" };
  const caption = str(b.caption, 2000);
  const media_path = kind === "text" ? "" : str(b.media_path, 200);
  const poster_path = kind === "video" ? str(b.poster_path, 200) : "";
  if (kind === "text" && !caption) return { error: "Write the news text" };
  if (kind !== "text" && !isMediaPath(media_path)) return { error: "Upload the file first" };
  if (poster_path && !isMediaPath(poster_path)) return { error: "Cover image is not valid" };
  const n = (v: unknown) => Math.max(0, Math.min(10000, Math.round(Number(v) || 0)));
  const bg = /^#[0-9a-f]{6}$/i.test(str(b.bg, 7)) ? str(b.bg, 7) : COLORS[0];
  return {
    row: {
      id: uid("news"),
      kind,
      caption,
      media_path,
      poster_path,
      width: n(b.width),
      height: n(b.height),
      bg,
      pinned: Boolean(b.pinned),
      active: b.active === undefined ? true : Boolean(b.active),
      sort: 0,
      created_at: new Date().toISOString(),
    },
  };
}

export function cleanPatch(b: Record<string, unknown>, e: NewsPost): Partial<NewsPost> {
  const out: Partial<NewsPost> = {};
  if (b.caption !== undefined) out.caption = str(b.caption, 2000);
  if (b.pinned !== undefined) out.pinned = Boolean(b.pinned);
  if (b.active !== undefined) out.active = Boolean(b.active);
  if (b.bg !== undefined && /^#[0-9a-f]{6}$/i.test(str(b.bg, 7))) out.bg = str(b.bg, 7);
  if (e.kind === "text" && out.caption === "") delete out.caption;
  return out;
}
