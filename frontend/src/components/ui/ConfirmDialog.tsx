import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Icon } from "@/components/portal/Icon";
import { PortalButton } from "@/components/portal/kit";

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
 * Confirmación en pantalla — deliberadamente NO el `window.confirm()` del
 * navegador (el usuario pidió un aviso propio, no uno "local").
 *
 * En lo destructivo el diseño tiene trabajo que hacer: el icono de alerta va en
 * rojo tierra de la marca, el botón que borra es el que lleva el peso, y el de
 * cancelar queda a mano y sin castigo visual. Antes ambos eran la misma
 * píldora y era fácil pulsar el equivocado.
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-isel-deep/60 p-4 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="w-full max-w-sm rounded-2xl border border-isel-line bg-white p-6 shadow-card-hover"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                danger ? "bg-isel-alert/10 text-isel-alert" : "bg-isel-navy/[0.07] text-isel-navy"
              }`}
            >
              <Icon name={danger ? "alert" : "info"} size={20} />
            </span>

            <h3 className="mt-4 font-display text-[17px] font-semibold tracking-tightest text-isel-navy">{title}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-isel-ink/65">{message}</p>

            <div className="mt-7 flex justify-end gap-3">
              <PortalButton tone="ghost" onClick={onCancel}>
                {cancelLabel}
              </PortalButton>
              <PortalButton
                tone={danger ? "danger" : "primary"}
                icon={danger ? "trash" : "check"}
                onClick={onConfirm}
                className={danger ? "border-transparent bg-isel-alert text-white hover:bg-isel-alert2 hover:text-white" : ""}
              >
                {confirmLabel}
              </PortalButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
