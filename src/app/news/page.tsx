import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { HospitalBadge, Wordmark } from "@/components/brand";

export const metadata = {
  title: "News",
  description: "News and updates for the Emergency Department.",
};

export default function NewsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-[max(14px,env(safe-area-inset-top))] sm:px-6 sm:pb-6">
      <header className="flex items-center justify-between gap-3 py-3" dir="ltr">
        <Link href="/" aria-label="العودة إلى الرئيسية">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden md:block">
            <HospitalBadge size={30} />
          </span>
          <Link href="/" className="btn btn-ghost btn-sm" dir="rtl">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            الرئيسية
          </Link>
        </div>
      </header>

      <section className="glass mx-auto mt-8 flex min-h-[320px] max-w-3xl flex-col items-center justify-center px-6 py-12 text-center sm:mt-14 sm:px-10" dir="rtl">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky/20 bg-sky/10 text-sky">
          <Newspaper className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <p className="eyebrow">قسم الطوارئ</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">الأخبار والتحديثات</h1>
        <p className="mt-4 max-w-lg text-base leading-8 text-ink-2">
          ستكون هذه الصفحة مساحة لأخبار وتحديثات القسم. المحتوى قيد الإعداد.
        </p>
        <span className="mt-6 rounded-full border border-sky/20 bg-sky/10 px-4 py-1.5 text-sm font-medium text-sky">
          قريبًا
        </span>
      </section>
    </main>
  );
}
