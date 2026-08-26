import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centered, on-screen confirmation — deliberately NOT the browser's native
 * `window.confirm()` (the user asked for a visible in-app alert, not a
 * "local" browser dialog). Used before any destructive or edit action in
 * the admin panel (delete/edit a student, delete a ficha).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Sí, continuar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-isel-ink/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card-hover"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-isel-navy">{title}</h3>
            <p className="mt-2 text-sm text-isel-ink/70">{message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border-2 border-isel-line px-4 py-2 text-sm font-semibold text-isel-ink/70 hover:border-isel-navy hover:text-isel-navy"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors duration-300 ${
                  danger ? "bg-red-600 hover:bg-red-700" : "bg-isel-navy hover:bg-isel-gold hover:text-isel-navy"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
