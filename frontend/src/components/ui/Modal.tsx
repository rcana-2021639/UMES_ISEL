import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  widthClassName?: string;
}

/**
 * Generic centered dialog (first reusable Modal in the codebase — used by the
 * admin "Agregar / editar alumno" form). Solid colors only, no gradients;
 * fades + rises in with framer-motion, closes on backdrop click or Escape.
 */
export function Modal({ open, onClose, title, children, widthClassName = "max-w-lg" }: ModalProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-isel-ink/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`w-full ${widthClassName} max-h-[90vh] overflow-y-auto rounded-2xl bg-isel-paper shadow-card-hover`}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-isel-line px-6 py-4">
              <h3 className="font-display text-lg font-semibold text-isel-navy">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-2 py-1 text-isel-ink/50 transition-colors duration-200 hover:bg-isel-line hover:text-isel-ink"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
