"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { House, LayoutDashboard, SquareCheckBig } from "lucide-react";
import { cx } from "@/lib/utils";

export const LAST_DEPT = "chk_last_dept";

/** Phone tab bar for staff pages, modelled on the reference mock-up. */
export function StaffNav() {
  const path = usePathname();
  const [dept, setDept] = useState("/");
  useEffect(() => {
    try {
      const d = localStorage.getItem(LAST_DEPT);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser storage once after mount
      if (d) setDept(`/d/${d}`);
    } catch {}
  }, [path]);

  const onLists = path.startsWith("/d/");
  const items = [
    { href: "/admin", label: "الإدارة", sub: "Admin", icon: LayoutDashboard, active: false },
    { href: dept, label: "القوائم", sub: "Checklists", icon: SquareCheckBig, active: onLists, center: true },
    { href: "/", label: "الرئيسية", sub: "Home", icon: House, active: path === "/" },
  ];

  return (
    <nav
      className="glass-strong fixed inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] z-40 flex items-end justify-around px-2 pb-2 pt-1.5 sm:hidden"
      style={{ borderRadius: 26 }}
      aria-label="Main"
    >
      {items.map((it) =>
        it.center ? (
          <Link key={it.label} href={it.href} className="-mt-7 flex flex-col items-center gap-1" aria-current={it.active ? "page" : undefined}>
            <motion.span
              whileTap={{ scale: 0.92 }}
              className="glow grid h-14 w-14 place-items-center rounded-[18px] border text-sky"
            >
              <it.icon className="h-7 w-7 drop-shadow-[0_0_8px_rgba(47,211,224,.8)]" strokeWidth={2} />
            </motion.span>
            <span className={cx("text-[12px] font-semibold", it.active ? "text-sky" : "text-ink-2")}>{it.label}</span>
          </Link>
        ) : (
          <Link
            key={it.label}
            href={it.href}
            className={cx("flex min-w-16 flex-col items-center gap-1 py-1.5 text-[12px] font-medium", it.active ? "text-sky" : "text-ink-3")}
            aria-current={it.active ? "page" : undefined}
          >
            <it.icon className="h-6 w-6" strokeWidth={1.7} />
            {it.label}
          </Link>
        ),
      )}
      <span className="pointer-events-none absolute bottom-1 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-sky/70 shadow-[0_0_12px_rgba(47,211,224,.9)]" aria-hidden />
    </nav>
  );
}
