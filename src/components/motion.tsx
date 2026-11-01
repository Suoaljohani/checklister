"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Fade + rise, staggered by index. Only opacity/transform so it stays on the GPU. */
export function Rise({ i = 0, children, className, ...rest }: HTMLMotionProps<"div"> & { i?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.03 + i * 0.04 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
