"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { EASE } from "./motion";

export function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${Math.round(v).toLocaleString("en-US")}${suffix}`);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: 1.2, ease: EASE });
    return () => c.stop();
  }, [value, mv, reduce]);
  return <motion.span>{text}</motion.span>;
}

/** Glowing cyan progress ring (reference: "78%" compliance dial). */
export function Ring({ pct, size = 112, stroke = 9, label }: { pct: number; size?: number; stroke?: number; label?: React.ReactNode }) {
  const r = 50 - stroke / 2 - 2;
  const C = 2 * Math.PI * r;
  const id = `ring-${size}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 overflow-visible">
        <defs>
          <linearGradient id={id} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#8af0f5" />
            <stop offset="1" stopColor="#22b8c4" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(160,236,245,.12)" strokeWidth={stroke} />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={C}
          filter={`url(#${id}-glow)`}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - Math.min(1, Math.max(0, pct))) }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.25 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {label ?? (
          <span className="num font-semibold" style={{ fontSize: size * 0.22 }}>
            <Counter value={Math.round(pct * 100)} suffix="%" />
          </span>
        )}
      </div>
    </div>
  );
}
