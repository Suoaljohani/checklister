"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clapperboard } from "lucide-react";
import { cx } from "@/lib/utils";

const SEEN = "chk_news_seen";

/** "News" pill for staff pages, with a dot when there are posts not seen yet. */
/** `fallback` is shown instead while there is no news (or before it loads). */
export function NewsButton({ className, fallback = null }: { className?: string; fallback?: React.ReactNode }) {
  const [fresh, setFresh] = useState(false);
  const [any, setAny] = useState(false);
  useEffect(() => {
    fetch("/api/news?meta=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { latest: string; count: number }) => {
        setAny(j.count > 0);
        let seen = "";
        try {
          seen = localStorage.getItem(SEEN) ?? "";
        } catch {}
        setFresh(!!j.latest && j.latest > seen);
      })
      .catch(() => {});
  }, []);
  if (!any) return <>{fallback}</>;
  return (
    <Link href="/news" className={cx("btn btn-ghost btn-sm relative rounded-full", className)} aria-label={fresh ? "News, new posts" : "News"}>
      <Clapperboard className="h-4 w-4" />
      <span>الأخبار</span>
      {fresh && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-er ring-2 ring-[#0a2b35]" aria-hidden />}
    </Link>
  );
}
