import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /** Use for a subtle scale-in instead of a pure slide-up. */
  scale?: boolean;
  style?: CSSProperties;
}

/**
 * Wraps children in a scroll-triggered reveal (fade + rise), used throughout
 * the page so content animates in as the user scrolls instead of sitting flat.
 * Fires once per element (viewport.once) so re-scrolling doesn't replay it.
 */
export function RevealOnScroll({ children, className, delay = 0, y = 32, scale = false, style }: RevealOnScrollProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y, scale: scale ? 0.96 : 1 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

/** Provides a shared stagger context; pair with <RevealOnScroll> children that opt into variants. */
export function StaggerGroup({ children, className, staggerDelay = 0.12 }: StaggerGroupProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ staggerChildren: staggerDelay }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
