import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { SNAP } from "./RevealOnScroll";

/**
 * Anillo que acompaña al puntero.
 *
 * No sustituye al cursor del sistema —en un sitio institucional esconderlo
 * es un riesgo de usabilidad—: lo acompaña con retraso elástico y reacciona a
 * lo que hay debajo. Cualquier elemento con `data-cursor="texto"` hace que el
 * anillo crezca y muestre esa palabra, así el puntero anuncia la acción antes
 * del clic (las tarjetas de maestría dicen "Ver").
 *
 * Se apaga por completo en táctil y con prefers-reduced-motion.
 */
export function CursorRing() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [hot, setHot] = useState(false);
  const [visible, setVisible] = useState(false);

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  // Retraso suficiente para que se lea como un objeto con inercia, no como
  // un segundo puntero pegado al primero.
  const sx = useSpring(x, { stiffness: 380, damping: 34, mass: 0.7 });
  const sy = useSpring(y, { stiffness: 380, damping: 34, mass: 0.7 });

  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);

    function onMove(e: MouseEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);

      const target = e.target as Element | null;
      const tagged = target?.closest?.("[data-cursor]") as HTMLElement | null;
      if (tagged) {
        setLabel(tagged.dataset.cursor || null);
        setHot(true);
        return;
      }
      setLabel(null);
      setHot(Boolean(target?.closest?.("a, button, [role='button'], input, select, textarea")));
    }
    function onLeave() {
      setVisible(false);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [reduce, x, y]);

  if (!enabled) return null;

  const size = label ? 84 : hot ? 46 : 26;

  return (
    <motion.div
      aria-hidden
      className="cursor-ring hidden lg:block"
      style={{ x: sx, y: sy }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        animate={{ width: size, height: size, borderWidth: label ? 0 : 1.5 }}
        transition={{ duration: 0.42, ease: SNAP }}
        className="flex items-center justify-center rounded-full border-white/80"
        style={{
          marginLeft: -size / 2,
          marginTop: -size / 2,
          backgroundColor: label ? "rgba(255,255,255,0.92)" : "transparent",
        }}
      >
        <AnimatePresence>
          {label && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.28, ease: SNAP }}
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-black"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
