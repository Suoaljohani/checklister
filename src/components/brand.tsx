import Image from "next/image";
import Link from "next/link";
import { SquareCheckBig } from "lucide-react";

/** "checklistER" wordmark, as in the reference designs. */
export function Wordmark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="focus-ring group flex items-center gap-2.5 rounded-2xl" aria-label="checklistER home">
      <span className="glass grid h-10 w-10 place-items-center text-sky transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105" style={{ borderRadius: 13 }}>
        <SquareCheckBig className="h-[22px] w-[22px] drop-shadow-[0_0_8px_rgba(47,211,224,.7)]" strokeWidth={2} />
      </span>
      <span className={compact ? "text-[19px] font-bold tracking-tight" : "text-[21px] font-bold tracking-tight"}>
        checklist<span className="text-er drop-shadow-[0_0_10px_rgba(255,90,106,.45)]">ER</span>
      </span>
    </Link>
  );
}

export function HospitalBadge({ size = 40 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid place-items-center rounded-[14px] bg-white/90 shadow-[0_0_20px_-6px_rgba(47,211,224,.6)]" style={{ width: size + 8, height: size + 8 }}>
        <Image src="/brand/logo.svg" alt="Alhadithah General Hospital" width={size} height={size} />
      </span>
      <span className="hidden leading-tight sm:block">
        <span className="block text-[13px] font-semibold">Alhadithah General Hospital</span>
        <span className="block text-[12px] text-ink-3">مستشفى الحديثة العام</span>
      </span>
    </span>
  );
}

export { Wordmark as BrandMark };
