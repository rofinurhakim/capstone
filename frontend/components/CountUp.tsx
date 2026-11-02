"use client";
import { animate, useMotionValue, useTransform, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

export default function CountUp({ to }: { to: number }) {
  const reduce = useReducedMotion();
  const v = useMotionValue(reduce ? to : 0);
  const shown = useTransform(v, (x) => Math.round(x));
  useEffect(() => { if (!reduce) { const c = animate(v, to, { duration: 1.1, ease: "easeOut" }); return () => c.stop(); } }, [to, reduce, v]);
  return <motion.span>{shown}</motion.span>;
}
