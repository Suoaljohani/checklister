"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { clearSavedSignature } from "@/components/staff";

export function ResourceStaffSignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_no: form.get("employee_no"),
          password: form.get("password"),
        }),
      });

      if (response.ok) {
        clearSavedSignature();
        window.location.reload();
        return;
      }

      const errors: Record<number, string> = {
        429: "تكررت المحاولات. حاولي مرة أخرى بعد بضع دقائق.",
        401: "الرقم الوظيفي أو كلمة المرور غير صحيحة.",
      };
      setError(errors[response.status] ?? "تعذر تسجيل الدخول. حاولي مرة أخرى.");
    } catch {
      setError("تعذر الاتصال. تحققي من الشبكة وحاولي مرة أخرى.");
    }
    setBusy(false);
  }

  return (
    <form method="post" onSubmit={signIn} className="glass mx-auto grid max-w-sm gap-4 p-5" dir="rtl" lang="ar">
      <h2 className="text-xl font-semibold">دخول الموظفين</h2>
      <label className="grid gap-1">
        الرقم الوظيفي
        <input className="field w-full" name="employee_no" autoComplete="username" dir="ltr" required />
      </label>
      <label className="grid gap-1">
        كلمة المرور
        <input className="field w-full" name="password" type="password" autoComplete="current-password" dir="ltr" required />
      </label>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}</button>
    </form>
  );
}
