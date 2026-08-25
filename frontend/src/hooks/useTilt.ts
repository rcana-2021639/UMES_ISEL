import { useRef } from "react";
import { useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";

export interface TiltHandlers {
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  glareX: MotionValue<number>;
  glareY: MotionValue<number>;
  onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
}

/**
 * Per-element 3D tilt driven by cursor position — NOT a global cursor
 * follower/aura. Attach `onMouseMove`/`onMouseLeave` to a card and apply
 * `rotateX`/`rotateY` (plus `transformPerspective`) via framer-motion's
 * `style` prop. `glareX`/`glareY` (0-100) can drive an optional sheen.
 */
export function useTilt(intensity = 8): TiltHandlers {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { stiffness: 260, damping: 22, mass: 0.4 };

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [intensity, -intensity]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-intensity, intensity]), springConfig);
  const glareX = useSpring(useTransform(x, [-0.5, 0.5], [0, 100]), springConfig);
  const glareY = useSpring(useTransform(y, [-0.5, 0.5], [0, 100]), springConfig);

  const frame = useRef<number>();

  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    const target = e.currentTarget;
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      x.set((clientX - rect.left) / rect.width - 0.5);
      y.set((clientY - rect.top) / rect.height - 0.5);
    });
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return { rotateX, rotateY, glareX, glareY, onMouseMove, onMouseLeave };
}
