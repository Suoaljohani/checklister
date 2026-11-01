/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Eraser, LoaderCircle, PenLine, X } from "lucide-react";
import type SignaturePadType from "signature_pad";
import { EASE } from "./motion";
import { getSavedSignature, saveSignature } from "./staff";

export function SignatureSheet({
  open,
  busy,
  name,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  name: string;
  onClose: () => void;
  onConfirm: (png: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadType | null>(null);
  const [empty, setEmpty] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const [mode, setMode] = useState<"saved" | "draw">("draw");
  const [remember, setRemember] = useState(true);
  const [wasOpen, setWasOpen] = useState(false);

  // Each time the sheet opens, offer the saved signature for this name if there is one.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const png = getSavedSignature(name);
      setSaved(png);
      setMode(png ? "saved" : "draw");
      setRemember(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!open || mode !== "draw") return;
    let pad: SignaturePadType | null = null;
    let cancelled = false;
    const resize = () => {
      const c = canvasRef.current;
      if (!c || !pad) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.toData();
      c.width = c.offsetWidth * ratio;
      c.height = c.offsetHeight * ratio;
      c.getContext("2d")!.scale(ratio, ratio);
      pad.clear();
      pad.fromData(data);
    };
    import("signature_pad").then(({ default: SignaturePad }) => {
      if (cancelled || !canvasRef.current) return;
      pad = new SignaturePad(canvasRef.current, {
        penColor: "#0d2138",
        minWidth: 0.9,
        maxWidth: 2.6,
        velocityFilterWeight: 0.6,
        backgroundColor: "rgba(0,0,0,0)",
      });
      pad.addEventListener("endStroke", () => setEmpty(pad!.isEmpty()));
      padRef.current = pad;
      setEmpty(true);
      requestAnimationFrame(resize);
    });
    window.addEventListener("resize", resize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", resize);
      pad?.off();
      padRef.current = null;
    };
  }, [open, mode]);

  function clear() {
    padRef.current?.clear();
    setEmpty(true);
  }

  function confirm() {
    if (mode === "saved" && saved) return onConfirm(saved);
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    const png = trimmed(canvasRef.current!);
    if (remember) saveSignature(name, png);
    onConfirm(png);
  }

  const ready = mode === "saved" ? !!saved : !empty;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sig-title"
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[6px]"
            onClick={() => !busy && onClose()}
            aria-hidden
          />
          <motion.div
            className="glass-strong relative w-full max-w-xl rounded-b-none p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-b-[22px] sm:p-6"
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/15 sm:hidden" aria-hidden />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Final step · التوقيع</p>
                <h2 id="sig-title" className="mt-1 text-[22px] font-semibold tracking-tight">
                  {mode === "saved" ? "Use your saved signature" : "Sign with your finger"}
                </h2>
                <p className="mt-1 text-[14px] text-ink-2">
                  Signing confirms the readings were checked by <span className="font-semibold text-ink">{name}</span>.
                </p>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon shrink-0" onClick={onClose} disabled={busy} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {mode === "saved" && saved ? (
              <div className="relative mt-5 flex h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-ink/10 bg-[#f4fbfc] p-6 shadow-[inset_0_2px_10px_rgba(0,30,40,.25)] sm:h-[240px]">
                <img src={saved} alt={`Saved signature of ${name}`} className="max-h-full max-w-full object-contain" />
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-green/15 px-2 py-1 text-[11px] font-semibold text-green">
                  <Check className="h-3 w-3" strokeWidth={3} /> Saved on this phone
                </span>
              </div>
            ) : (
              <div className="relative mt-5 overflow-hidden rounded-2xl border border-ink/10 bg-[#f4fbfc] shadow-[inset_0_2px_10px_rgba(0,30,40,.25)]">
                <canvas ref={canvasRef} className="block h-[220px] w-full touch-none sm:h-[240px]" />
                <div className="pointer-events-none absolute inset-x-6 bottom-12 border-b border-dashed border-ink/20" aria-hidden />
                <AnimatePresence>
                  {empty && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-3"
                    >
                      <PenLine className="h-6 w-6" strokeWidth={1.4} />
                      <span className="text-[14px]">Sign here</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {mode === "draw" && (
              <label className="mt-4 flex items-center gap-2 text-[14px] text-ink-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#1691d0]"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={busy}
                />
                Save my signature on this phone for next time
              </label>
            )}

            <div className="mt-5 flex gap-3">
              {mode === "saved" ? (
                <button className="btn btn-ghost" onClick={() => setMode("draw")} disabled={busy}>
                  <PenLine className="h-4 w-4" /> Draw new
                </button>
              ) : (
                <button className="btn btn-ghost" onClick={clear} disabled={busy || empty}>
                  <Eraser className="h-4 w-4" /> Clear
                </button>
              )}
              <button className="btn btn-primary flex-1" onClick={confirm} disabled={busy || !ready}>
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Submitting…" : "Confirm & submit"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Crop the transparent margins so the signature fits report cells nicely. */
function trimmed(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const px = ctx.getImageData(0, 0, width, height).data;
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (px[(y * width + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 <= x0 || y1 <= y0) return canvas.toDataURL("image/png");
  const pad = 12;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(width, x1 + pad); y1 = Math.min(height, y1 + pad);
  const w = x1 - x0, h = y1 - y0;
  const scale = Math.min(1, 600 / w, 240 / h);
  const out = document.createElement("canvas");
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  out.getContext("2d")!.drawImage(canvas, x0, y0, w, h, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
