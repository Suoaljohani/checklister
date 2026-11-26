import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowRight, BookOpen, MapPin } from "lucide-react";
import { currentEmployee, isAdmin } from "@/lib/auth";
import { resourceLocationPath, resourceLocations, resourceReferences } from "@/lib/resources";
import { ResourceStaffSignIn } from "./staff-sign-in";
import { ResourceQrLabels } from "./qr-labels";

export const metadata = {
  title: "ER Digital Resources",
  robots: { index: false, follow: false },
};

type Params = Promise<{ location?: string[] }>;

export default function ResourcesPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 print:m-0 print:max-w-none print:p-0" dir="rtl" lang="ar">
      <header className="mb-6 print:hidden">
        <Link href="/" className="btn btn-ghost btn-sm mb-4">
          <ArrowRight className="size-4" /> ER Checklist
        </Link>
        <h1 className="text-3xl font-bold sm:text-4xl">المكتبة الإلكترونية للطوارئ</h1>
        <p className="mt-1 text-ink-2" lang="en">ER Digital Resources</p>
      </header>
      <Suspense fallback={<p role="status">جارٍ التحقق من الدخول…</p>}>
        <ResourceContent params={params} />
      </Suspense>
    </main>
  );
}

async function ResourceContent({ params }: { params: Params }) {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET && !process.env.ADMIN_PASSWORD) {
    return <p className="glass p-5">دخول المكتبة غير متاح حاليًا. تواصلي مع إدارة الموقع.</p>;
  }

  await connection();
  const admin = await isAdmin();
  if (!admin && !(await currentEmployee())) return <ResourceStaffSignIn />;

  const { location = [] } = await params;
  if (location.length) {
    const entry = resourceLocations.find(({ code }) => code === location[0]);
    if (location.length !== 1 || !entry) notFound();

    return (
      <section className="glass p-5 sm:p-7">
        <Link href="/resources" prefetch={false} className="btn btn-ghost btn-sm mb-4">
          <ArrowRight className="size-4" /> كل الموارد
        </Link>
        <p className="text-sm text-sky" lang="en">{entry.category}</p>
        <h2 className="mt-1 text-2xl font-semibold">{entry.label}</h2>
        <p className="mt-2 text-ink-2">{entry.reference}</p>
        <p className="mt-5 flex items-center gap-2 text-sm text-ink-3">
          <MapPin className="size-4" /> <bdi className="font-mono">{entry.code}</bdi>
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="print:hidden" aria-labelledby="resource-locations">
        <h2 id="resource-locations" className="mb-3 text-xl font-semibold">المواقع التجريبية</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {resourceLocations.map(({ code, label, english }) => (
            <Link key={code} href={resourceLocationPath(code)} prefetch={false} className="glass glass-hover focus-ring p-4">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-sky" />
                <h3 className="font-semibold">{label}</h3>
              </div>
              <p className="mt-1 text-sm text-ink-2" lang="en">{english}</p>
              <bdi className="mt-2 block font-mono text-xs text-ink-3">{code}</bdi>
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-6 print:hidden" aria-labelledby="resource-references">
        <h2 id="resource-references" className="mb-3 text-xl font-semibold">مراجع القسم</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {resourceReferences.map(({ label, english, reference }) => (
            <article key={english} className="glass p-4">
              <BookOpen className="mb-2 size-4 text-sky" />
              <h3 className="font-semibold">{label}</h3>
              <p className="text-sm text-ink-3" lang="en">{english}</p>
              <p className="mt-2 text-sm text-ink-2">{reference}</p>
            </article>
          ))}
        </div>
      </section>
      {admin && (
        <ResourceQrLabels labels={resourceLocations.map(({ code, label, english }) => ({
          code,
          title: label,
          english,
          path: resourceLocationPath(code),
        }))} />
      )}
    </>
  );
}
