"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Fade + rise + frost-resolve, staggered by index. */
export function Rise({ i = 0, children, className, ...rest }: HTMLMotionProps<"div"> & { i?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(6px)" }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.05 + i * 0.06 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
