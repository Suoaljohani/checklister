"use client";

import Image from "next/image";
import { useState } from "react";
import { Printer, QrCode } from "lucide-react";
import styles from "./resources.module.css";

type Label = { code: string; title: string; english: string; path: string };

export function ResourceQrLabels({ labels }: { labels: Label[] }) {
  const [items, setItems] = useState<(Label & { url: string; image: string })[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function generate() {
    setStatus("loading");
    try {
      const qr = (await import("qrcode")).default;
      const ready = await Promise.all(labels.map(async (label) => {
        const url = new URL(label.path, window.location.origin).href;
        const image = await qr.toDataURL(url, { width: 320, margin: 4, errorCorrectionLevel: "M" });
        return { ...label, url, image };
      }));
      setItems(ready);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="glass mt-6 p-5 print:m-0 print:border-0 print:bg-white print:p-0 print:shadow-none print:backdrop-filter-none">
      <div className="print:hidden">
        <h2 className="text-xl font-semibold">ملصقات QR التجريبية</h2>
        <p className="mt-2 text-sm text-ink-2">تأكدي من مطابقة الموقع على أرض الواقع، وامسحي الرمز من جهاز القسم قبل تثبيته.</p>
        {items.length ? (
          <button type="button" className="btn btn-primary mt-4" onClick={() => window.print()}>
            <Printer className="size-4" /> طباعة الملصقات
          </button>
        ) : (
          <button type="button" className="btn btn-ghost mt-4" onClick={generate} disabled={status === "loading"}>
            <QrCode className="size-4" /> {status === "loading" ? "جارٍ إنشاء الرموز…" : "إنشاء الرموز"}
          </button>
        )}
        {status === "error" && <p role="alert" className="mt-2 text-danger">تعذر إنشاء الرموز. حاولي مرة أخرى.</p>}
      </div>
      {!!items.length && (
        <div className={styles.labels} data-resource-labels>
          {items.map(({ code, title, english, url, image }) => (
            <article key={code} className={styles.label}>
              <p className="font-semibold">{title}</p>
              <p lang="en" dir="ltr" className="text-sm">{english}</p>
              <Image unoptimized loading="eager" src={image} width={128} height={128} alt={`QR ${code}`} />
              <p dir="ltr" className="font-mono text-sm">{code}</p>
              <p dir="ltr" className="mt-1 break-all text-xs">{url}</p>
              <p className="mt-2 text-xs">مستشفى الحديثة العام · قسم الطوارئ</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
