"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, Eye, EyeOff, Film, ImageIcon, LoaderCircle, Pin, PinOff, Plus, Trash2, Type, Upload } from "lucide-react";
import { Modal } from "@/components/modal";
import { EASE } from "@/components/motion";
import { cx, zoned } from "@/lib/utils";
import { useToast } from "../admin-shell";
import { api, PageTitle, useData } from "../use-data";

type Post = {
  id: string;
  kind: "image" | "video" | "text";
  caption: string;
  media_url: string;
  poster_url: string;
  bg: string;
  pinned: boolean;
  active: boolean;
  created_at: string;
};

type Target = { path: string; url: string; method: "PUT"; headers: Record<string, string> };

const COLORS = ["#0f766e", "#1691D0", "#283A83", "#7A5AF8", "#E0475B", "#04A67A", "#E9A23B"];
const MAX_VIDEO_MB = 50;

/* ---------- file helpers (run in the admin's browser) ---------- */

async function shrinkImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("Could not read the photo"))), "image/jpeg", 0.85));
    return { blob, width: c.width, height: c.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Size of the video and a cover image taken from it. */
async function videoInfo(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    await new Promise<void>((ok, no) => {
      v.onloadedmetadata = () => ok();
      v.onerror = () => no(new Error("This video format can't be read here. Use MP4."));
    });
    v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
    await new Promise<void>((ok) => {
      v.onseeked = () => ok();
      setTimeout(ok, 3000);
    });
    const scale = Math.min(1, 1080 / Math.max(v.videoWidth, v.videoHeight, 1));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(v.videoWidth * scale));
    c.height = Math.max(1, Math.round(v.videoHeight * scale));
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    const poster = await new Promise<Blob | null>((ok) => c.toBlob((b) => ok(b), "image/jpeg", 0.8));
    return { width: v.videoWidth, height: v.videoHeight, duration: v.duration, poster };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function put(t: Target, body: Blob, onProgress: (f: number) => void) {
  return new Promise<void>((ok, no) => {
    const x = new XMLHttpRequest();
    x.open(t.method, t.url);
    for (const [k, v] of Object.entries(t.headers)) x.setRequestHeader(k, v);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => (x.status >= 200 && x.status < 300 ? ok() : no(new Error(`Upload failed (${x.status})`)));
    x.onerror = () => no(new Error("Upload failed. Check the connection and try again."));
    x.send(body);
  });
}

async function upload(blob: Blob, onProgress: (f: number) => void) {
  const t = await api<Target>("/api/admin/news/upload-url", "POST", { contentType: blob.type, size: blob.size });
  await put(t, blob, onProgress);
  return t.path;
}

/* ---------- page ---------- */

export default function NewsAdminPage() {
  const toast = useToast();
  const { data, reload, setData, error } = useData<Post[]>("/api/admin/news");
  const [open, setOpen] = useState(false);

  async function patch(p: Post, body: Partial<Post>, msg: string) {
    setData((d) => d?.map((x) => (x.id === p.id ? { ...x, ...body } : x)) ?? null);
    try {
      await api(`/api/admin/news/${p.id}`, "PATCH", body);
      toast(msg);
      if ("pinned" in body) reload();
    } catch (e) {
      toast((e as Error).message, "error");
      reload();
    }
  }

  async function remove(p: Post) {
    if (!confirm("Delete this post and its photo or video? This can't be undone.")) return;
    try {
      await api(`/api/admin/news/${p.id}`, "DELETE");
      setData((d) => d?.filter((x) => x.id !== p.id) ?? null);
      toast("Post deleted");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div>
      <PageTitle title="News" sub="Photos, videos and updates for staff · أخبار القسم">
        <Link href="/news" target="_blank" className="btn btn-ghost">
          <ExternalLink className="h-4 w-4" /> Open feed
        </Link>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New post
        </button>
      </PageTitle>

      {error && <p className="glass mb-4 p-4 text-[14px] text-danger">Could not load the news. If this is new, the database update for news may still be needed.</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence initial={false}>
          {data?.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={cx("glass flex flex-col overflow-hidden p-0", !p.active && "opacity-55")}
            >
              <div className="relative aspect-[9/14] w-full overflow-hidden bg-black">
                {p.kind === "image" && <img src={p.media_url} alt="" className="h-full w-full object-cover" />}
                {p.kind === "video" && (p.poster_url ? <img src={p.poster_url} alt="" className="h-full w-full object-cover" /> : <video src={p.media_url} muted className="h-full w-full object-cover" />)}
                {p.kind === "text" && (
                  <div className="flex h-full items-center justify-center p-3 text-center text-[14px] font-bold leading-6" style={{ background: p.bg }} dir="auto">
                    <span className="line-clamp-6">{p.caption}</span>
                  </div>
                )}
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {p.kind === "video" ? <Film className="h-3 w-3" /> : p.kind === "image" ? <ImageIcon className="h-3 w-3" /> : <Type className="h-3 w-3" />}
                  {p.kind}
                </span>
                {p.pinned && (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-sky px-2 py-0.5 text-[11px] font-semibold text-[#032a33]">
                    <Pin className="h-3 w-3" /> Pinned
                  </span>
                )}
                {!p.active && <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[12px] font-semibold text-white">Hidden</span>}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                {p.kind !== "text" && <p className="line-clamp-2 text-[13px] text-ink-2" dir="auto">{p.caption || "—"}</p>}
                <p className="num text-[11px] text-ink-3">
                  {zoned(p.created_at).date} · {zoned(p.created_at).time}
                </p>
                <div className="mt-auto flex gap-1.5">
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => patch(p, { active: !p.active }, p.active ? "Hidden from staff" : "Visible to staff")} aria-label={p.active ? "Hide" : "Show"}>
                    {p.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => patch(p, { pinned: !p.pinned }, p.pinned ? "Unpinned" : "Pinned to the top")} aria-label={p.pinned ? "Unpin" : "Pin"}>
                    {p.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </button>
                  <button className="btn btn-danger btn-sm btn-icon ml-auto" onClick={() => remove(p)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {data?.length === 0 && <p className="glass p-10 text-center text-ink-3">No posts yet. Add the first photo, video or update.</p>}
      {!data && !error && <div className="glass h-40 animate-pulse" />}

      <Composer
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          reload();
          toast("Posted · نُشر الخبر");
        }}
      />
    </div>
  );
}

function Composer({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [bg, setBg] = useState(COLORS[0]);
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const kind: "image" | "video" | "text" = !file ? "text" : file.type.startsWith("video/") ? "video" : "image";

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setCaption("");
    setPinned(false);
    setProgress(0);
    setErr("");
  }

  function pick(f: File | undefined) {
    setErr("");
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|heic|heif)$|^video\/(mp4|webm|quicktime)$/.test(f.type)) return setErr("Use a photo (JPG, PNG) or a video (MP4, MOV).");
    if (f.type.startsWith("video/") && f.size > MAX_VIDEO_MB * 1024 * 1024) return setErr(`Video is too large. Max ${MAX_VIDEO_MB} MB (about 1–2 minutes from a phone).`);
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function post() {
    setBusy(true);
    setErr("");
    setProgress(0);
    try {
      let body: Record<string, unknown> = { kind, caption, pinned, bg };
      if (kind === "image" && file) {
        const img = await shrinkImage(file);
        const path = await upload(img.blob, setProgress);
        body = { ...body, media_path: path, width: img.width, height: img.height };
      }
      if (kind === "video" && file) {
        const info = await videoInfo(file);
        if (info.duration > 180) throw new Error("Video is longer than 3 minutes. Please trim it.");
        const poster = info.poster ? await upload(info.poster, () => {}) : "";
        const path = await upload(file, setProgress);
        body = { ...body, media_path: path, poster_path: poster, width: info.width, height: info.height };
      }
      await api("/api/admin/news", "POST", body);
      reset();
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && (reset(), onClose())}
      title="New post · خبر جديد"
      footer={
        <>
          {err && <p className="mr-auto self-center text-[13px] text-danger">{err}</p>}
          <button className="btn btn-ghost" onClick={() => (reset(), onClose())} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={post} disabled={busy || (kind === "text" && !caption.trim())}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? (progress > 0 && progress < 1 ? `Uploading ${Math.round(progress * 100)}%` : "Posting…") : "Post"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="relative grid aspect-[9/14] w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-ink/25 bg-black/30 text-ink-3"
            style={kind === "text" ? { background: bg } : undefined}
          >
            {kind === "image" && <img src={preview} alt="" className="h-full w-full object-cover" />}
            {kind === "video" && <video src={preview} className="h-full w-full object-cover" muted autoPlay loop playsInline />}
            {kind === "text" && (
              <span className="flex flex-col items-center gap-2 p-4 text-center text-[13px] text-white/90">
                {caption ? <span className="line-clamp-6 text-[15px] font-bold" dir="auto">{caption}</span> : <><Upload className="h-7 w-7" /> Tap to add a photo or video<br />or just write text</>}
              </span>
            )}
          </button>
          <input ref={input} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
          {file && (
            <button type="button" className="mt-2 w-full text-[12px] text-ink-3 underline" onClick={() => (preview && URL.revokeObjectURL(preview), setFile(null), setPreview(""))} disabled={busy}>
              Remove file (text-only post)
            </button>
          )}
          {busy && progress > 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-sky transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="label">{kind === "text" ? "News text · نص الخبر" : "Caption · الوصف"}</label>
            <textarea className="field" rows={kind === "text" ? 7 : 5} dir="auto" maxLength={2000} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="اكتب الخبر هنا…" />
          </div>
          {kind === "text" && (
            <div>
              <label className="label">Background</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setBg(c)} aria-label={c} className={cx("h-8 w-8 rounded-full", bg === c && "ring-2 ring-white ring-offset-2 ring-offset-[rgba(13,33,56,.25)]")} style={{ background: c }} />
                ))}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-[14px] text-ink-2">
            <input type="checkbox" className="h-4 w-4 accent-[#2fd3e0]" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin to the top of the feed · تثبيت في الأعلى
          </label>
          <p className="text-[12px] text-ink-3">Photos are resized automatically. Videos: MP4 or MOV, up to {MAX_VIDEO_MB} MB and 3 minutes; vertical videos look best.</p>
        </div>
      </div>
    </Modal>
  );
}
