"use client";

import { useEffect, useState } from "react";

export function Copyright() {
  const [year, setYear] = useState(2026);
  const [owner, setOwner] = useState("MAlanazi354");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once after mount (browser-only value / data fetch)
    setYear(new Date().getFullYear());
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s?.copyright_owner && setOwner(s.copyright_owner))
      .catch(() => {});
  }, []);

  return (
    <footer className="px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-10 print:hidden">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3">
        <div className="h-px w-40 bg-gradient-to-r from-transparent via-ink/15 to-transparent" />
        <div className="glass flex items-center gap-3 rounded-full py-2 pl-2 pr-5 text-[13px] text-ink-2" style={{ borderRadius: 999 }}>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-sky to-navy text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4)]">
            M
          </span>
          <span>
            © <span className="num">{year}</span> · Designed &amp; developed by{" "}
            <span className="bg-gradient-to-r from-sky to-blue bg-clip-text font-semibold text-transparent">{owner}</span>
          </span>
        </div>
        <p className="text-[11.5px] tracking-wide text-ink-3">
          All rights reserved · Alhadithah General Hospital · جميع الحقوق محفوظة
        </p>
      </div>
    </footer>
  );
}
