"use client";

/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronsUp, Pause, Pin, Play, Share2, Volume2, VolumeX } from "lucide-react";
import { cx } from "@/lib/utils";

type Post = {
  id: string;
  kind: "image" | "video" | "text";
  caption: string;
  media_url: string;
  poster_url: string;
  width: number;
  height: number;
  bg: string;
  pinned: boolean;
  created_at: string;
};

export const NEWS_SEEN = "chk_news_seen";

function timeAgo(iso: string) {
  const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  const a = Math.abs(s);
  if (a < 60) return rtf.format(Math.round(s), "second");
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Riyadh" }).format(new Date(iso));
}

/** Vertical, full-screen news feed: swipe up for the next post. */
export function NewsFeed() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [hint, setHint] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const focus = useSearchParams().get("p");

  useEffect(() => {
    fetch("/api/news", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setPosts(j.posts ?? []))
      .catch(() => setPosts([]));
  }, []);

  // Remember what was seen, so entry points can show a "new" dot; show the swipe hint once.
  useEffect(() => {
    if (!posts?.length) return;
    try {
      const latest = posts.reduce((m, p) => (p.created_at > m ? p.created_at : m), "");
      localStorage.setItem(NEWS_SEEN, latest);
      if (posts.length > 1 && !localStorage.getItem("chk_news_hint")) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hint read from storage
        setHint(true);
        localStorage.setItem("chk_news_hint", "1");
      }
    } catch {}
  }, [posts]);

  // Open a shared post directly (/news?p=<id>).
  useEffect(() => {
    if (!posts || !focus) return;
    const i = posts.findIndex((p) => p.id === focus);
    if (i > 0) scroller.current?.children[i]?.scrollIntoView({ block: "start" });
  }, [posts, focus]);

  // Which slide is on screen.
  useEffect(() => {
    const root = scroller.current;
    if (!root || !posts?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { root, threshold: 0.6 },
    );
    Array.from(root.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [posts]);

  // Arrow keys on a computer.
  const go = useCallback((dir: 1 | -1) => {
    const root = scroller.current;
    if (!root) return;
    root.scrollBy({ top: dir * root.clientHeight, behavior: "smooth" });
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const dir = e.key === "ArrowDown" || e.key === "PageDown" ? 1 : e.key === "ArrowUp" || e.key === "PageUp" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      go(dir);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go]);

  const current = posts?.[active];

  return (
    <div className="fixed inset-0 z-[45] bg-black text-white" dir="rtl">
      {/* Phone-width column on large screens, full screen on phones */}
      <div className="relative mx-auto h-full w-full max-w-[520px] overflow-hidden sm:border-x sm:border-white/10">
        <div ref={scroller} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain">
          {posts?.map((p, i) => (
            <Slide key={p.id} post={p} index={i} active={i === active} near={Math.abs(i - active) <= 1} muted={muted} />
          ))}
          {posts?.length === 0 && <Empty />}
          {!posts && <div className="grid h-[100dvh] place-items-center text-white/60">…</div>}
        </div>

        {/* Top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-3 pb-8 pt-[max(12px,env(safe-area-inset-top))]">
          <Link href="/" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-black/30 backdrop-blur-md" aria-label="رجوع">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-[16px] font-bold tracking-tight drop-shadow">
            الأخبار <span className="font-normal text-white/70">· News</span>
          </p>
          {current?.kind === "video" ? (
            <button
              className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-black/30 backdrop-blur-md"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          ) : (
            <span className="h-10 w-10" />
          )}
        </div>

        {/* Position dots */}
        {posts && posts.length > 1 && (
          <div className="pointer-events-none absolute left-2 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
            {posts.slice(0, 12).map((p, i) => (
              <span key={p.id} className={cx("w-1 rounded-full bg-white transition-all", i === active ? "h-5 opacity-90" : "h-1.5 opacity-35")} />
            ))}
          </div>
        )}

        <AnimatePresence>
          {hint && active === 0 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: [0, -8, 0] }}
              exit={{ opacity: 0 }}
              transition={{ y: { repeat: 3, duration: 1.2 } }}
              onClick={() => {
                setHint(false);
                go(1);
              }}
              className="absolute bottom-[21%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 rounded-2xl bg-black/45 px-4 py-3 text-[13px] backdrop-blur-md"
            >
              <ChevronsUp className="h-6 w-6" />
              اسحب للأعلى للخبر التالي
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Slide({ post: p, index, active, near, muted }: { post: Post; index: number; active: boolean; near: boolean; muted: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState<"play" | "pause" | null>(null);
  const [progress, setProgress] = useState(0);
  const [more, setMore] = useState(false);
  const [copied, setCopied] = useState(false);

  // Play the video on screen, pause the others.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (active && !paused) v.play().catch(() => {});
    else v.pause();
  }, [active, paused]);
  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a post scrolled back into view starts playing again
    if (!active) setPaused(false);
  }, [active]);

  function toggle() {
    if (p.kind !== "video") return;
    setPaused((x) => !x);
    setFlash(paused ? "play" : "pause");
    setTimeout(() => setFlash(null), 600);
  }

  async function share() {
    const url = `${location.origin}/news?p=${encodeURIComponent(p.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: "أخبار قسم الطوارئ", text: p.caption.slice(0, 120), url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {}
  }

  const backdrop = p.kind === "video" ? p.poster_url : p.kind === "image" ? p.media_url : "";

  return (
    <section data-i={index} className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden" aria-label={`خبر ${index + 1}`}>
      {/* Background */}
      {p.kind === "text" ? (
        <div className="absolute inset-0" style={{ background: `radial-gradient(120% 80% at 80% 10%, ${p.bg}, #050b12 75%)` }} />
      ) : (
        backdrop && (
          <img src={near ? backdrop : undefined} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-2xl" />
        )
      )}

      {/* Media */}
      <div className="absolute inset-0 flex items-center justify-center" onClick={toggle}>
        {p.kind === "image" && near && <img src={p.media_url} alt={p.caption.slice(0, 80)} className="max-h-full w-full object-contain" />}
        {p.kind === "video" && near && (
          <video
            ref={video}
            src={p.media_url}
            poster={p.poster_url || undefined}
            className={cx("h-full w-full", p.height > p.width ? "object-cover" : "object-contain")}
            playsInline
            loop
            muted
            preload={active ? "auto" : "metadata"}
            onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
          />
        )}
        {p.kind === "text" && (
          <p className="max-w-[86%] whitespace-pre-line text-balance text-center text-[26px] font-bold leading-[1.5] drop-shadow-[0_2px_12px_rgba(0,0,0,.35)]" dir="auto">
            {p.caption}
          </p>
        )}
      </div>

      <AnimatePresence>
        {flash && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            className="pointer-events-none absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/40 backdrop-blur-sm"
          >
            {flash === "pause" ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9" />}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Side actions */}
      <div className="absolute bottom-[max(120px,calc(env(safe-area-inset-bottom)+110px))] left-3 flex flex-col items-center gap-4">
        <button onClick={share} className="flex flex-col items-center gap-1 text-[11px] font-semibold" aria-label="مشاركة">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-black/35 backdrop-blur-md">
            <Share2 className="h-6 w-6" />
          </span>
          {copied ? "تم النسخ" : "مشاركة"}
        </button>
      </div>

      {/* Caption */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-[max(22px,env(safe-area-inset-bottom))] pt-24">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white">
            <Image src="/brand/logo.svg" alt="" width={30} height={30} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-bold">قسم الطوارئ · مستشفى الحديثة العام</p>
            <p className="text-[12px] text-white/70">{timeAgo(p.created_at)}</p>
          </div>
          {p.pinned && (
            <span className="mr-auto flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold backdrop-blur-md">
              <Pin className="h-3 w-3" /> مثبّت
            </span>
          )}
        </div>
        {p.kind !== "text" && p.caption && (
          <button onClick={() => setMore((m) => !m)} className="mt-3 block w-full text-right" aria-expanded={more}>
            <p className={cx("whitespace-pre-line text-[15px] leading-7 text-white/95", !more && "line-clamp-3")} dir="auto">
              {p.caption}
            </p>
            {!more && p.caption.length > 140 && <span className="text-[13px] font-semibold text-white/70">المزيد</span>}
          </button>
        )}
      </div>

      {p.kind === "video" && (
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/15">
          <div className="h-full bg-white/90" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </section>
  );
}

function Empty() {
  return (
    <div className="grid h-[100dvh] place-items-center px-8 text-center">
      <div>
        <p className="text-[20px] font-bold">لا توجد أخبار بعد</p>
        <p className="mt-2 text-[14px] text-white/60">ستظهر هنا صور وفيديوهات وأخبار القسم.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-black">
          الرئيسية
        </Link>
      </div>
    </div>
  );
}
