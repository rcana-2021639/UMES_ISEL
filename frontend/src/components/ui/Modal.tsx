import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Icon } from "@/components/portal/Icon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  widthClassName?: string;
}

/**
 * Diálogo centrado del portal.
 *
 * El velo se oscurece y desenfoca el fondo —así la ventana no compite con la
 * tabla que quedó detrás—, la cabecera se queda fija al desplazar contenidos
 * largos (la ficha completa abierta desde el panel mide varias pantallas) y el
 * cierre es un botón con área de toque real, no una "✕" de texto.
 */
export function Modal({ open, onClose, title, children, widthClassName = "max-w-lg" }: ModalProps) {
  // Escape cierra desde cualquier sitio: antes dependía de que el foco
  // estuviera dentro del div que escuchaba la tecla, así que casi nunca corría.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-isel-deep/55 p-4 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`w-full ${widthClassName} max-h-[90vh] overflow-y-auto rounded-2xl border border-isel-line bg-isel-paper shadow-card-hover`}
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-isel-line bg-isel-paper/95 px-6 py-4 backdrop-blur">
              <h3 className="font-display text-[17px] font-semibold leading-snug tracking-tightest text-isel-navy">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-isel-ink/40 transition-colors duration-300 ease-crisp hover:bg-isel-navy/[0.07] hover:text-isel-navy"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="px-6 py-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
