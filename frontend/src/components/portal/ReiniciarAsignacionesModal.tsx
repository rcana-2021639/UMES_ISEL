import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Icon } from "@/components/portal/Icon";
import { Alert, Loading, PortalButton, fieldClass } from "@/components/portal/kit";
import { ApiError } from "@/lib/http";
import {
  getResumenReinicio,
  reiniciarAsignaciones,
  type ArchivoFichas,
  type ResumenReinicio,
} from "@/lib/archivoFichasApi";

const PALABRA = "REINICIAR";

/**
 * Las dos alertas antes de reiniciar las asignaciones.
 *
 * Son dos a propósito y no una con dos casillas: la primera explica qué pasa y
 * con cuántas fichas; la segunda, ya en otra ventana, pide escribir REINICIAR.
 * Un doble clic distraído atraviesa un "¿seguro?", pero no escribe una palabra.
 *
 * Las cifras se piden al servidor al abrir: la tabla del panel solo tiene
 * cargado el rango elegido (hoy, la semana…), y el reinicio se lleva todas las
 * fichas guardadas, de cualquier fecha.
 */
export function ReiniciarAsignacionesModal({
  open,
  periodoSugerido,
  onClose,
  onIniciado,
}: {
  open: boolean;
  periodoSugerido: string;
  onClose: () => void;
  onIniciado: (archivo: ArchivoFichas) => void;
}) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [resumen, setResumen] = useState<ResumenReinicio | null>(null);
  const [etiqueta, setEtiqueta] = useState(periodoSugerido);
  const [palabra, setPalabra] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPaso(1);
    setResumen(null);
    setEtiqueta(periodoSugerido);
    setPalabra("");
    setError(null);
    getResumenReinicio()
      .then(setResumen)
      .catch(() => setError("No se pudo consultar cuántas fichas hay guardadas."));
  }, [open, periodoSugerido]);

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      const archivo = await reiniciarAsignaciones(etiqueta.trim(), palabra);
      onIniciado(archivo);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo iniciar el reinicio.");
    } finally {
      setEnviando(false);
    }
  }

  const nada = resumen !== null && resumen.totalFichas === 0;
  const palabraOk = palabra.trim().toUpperCase() === PALABRA;

  return (
    <>
      <AlertaShell open={open && paso === 1} paso={1} titulo="¿Reiniciar las asignaciones?" onClose={onClose}>
        {!resumen && !error ? (
          <Loading label="Contando fichas" />
        ) : resumen ? (
          <div className="space-y-3 text-[13.5px] leading-relaxed text-isel-ink/70">
            {resumen.enCurso ? (
              <Alert kind="info">Ya se está generando un archivo de fichas. Espera a que termine antes de reiniciar otra vez.</Alert>
            ) : nada ? (
              <Alert kind="info">No hay fichas guardadas: no hay nada que reiniciar.</Alert>
            ) : (
              <>
                <p>
                  Se van a archivar y quitar del panel las{" "}
                  <strong className="text-isel-navy">{resumen.totalFichas}</strong> fichas guardadas, de todas las fechas.
                </p>
                <ol className="list-decimal space-y-1.5 pl-5">
                  <li>Primero se guarda el PDF de cada ficha en un ZIP, en «Archivo de fichas», más abajo.</li>
                  <li>Después se borran las fichas: todos los alumnos vuelven a aparecer sin asignar.</li>
                </ol>
                <p className="text-[12.5px] text-isel-ink/55">
                  No se toca el padrón de alumnos, el pénsum, las cohortes ni la papelería de nadie.
                </p>
                {resumen.pendientes > 0 && (
                  <Alert kind="error">
                    {resumen.pendientes === 1
                      ? "Hay 1 ficha que todavía no se ha impreso."
                      : `Hay ${resumen.pendientes} fichas que todavía no se han impreso.`}{" "}
                    Quedará en el ZIP, pero ya no en la tabla.
                  </Alert>
                )}
              </>
            )}
          </div>
        ) : null}
        {error && paso === 1 && <div className="mt-3"><Alert kind="error">{error}</Alert></div>}
        <div className="mt-7 flex justify-end gap-3">
          <PortalButton tone="ghost" onClick={onClose}>Cancelar</PortalButton>
          <PortalButton
            tone="danger"
            icon="arrowRight"
            iconRight
            disabled={!resumen || nada || resumen.enCurso}
            onClick={() => setPaso(2)}
          >
            Entiendo, continuar
          </PortalButton>
        </div>
      </AlertaShell>

      <AlertaShell open={open && paso === 2} paso={2} titulo="Última confirmación" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-[13.5px] leading-relaxed text-isel-ink/70">
            Las <strong className="text-isel-navy">{resumen?.totalFichas ?? 0}</strong> fichas dejarán de estar en el panel.
            Solo quedarán en el ZIP.
          </p>
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">
              Nombre del archivo
            </span>
            <input
              className={fieldClass}
              value={etiqueta}
              maxLength={120}
              onChange={(e) => setEtiqueta(e.target.value)}
              placeholder="cuarto trimestre 2026"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">
              Escribe {PALABRA} para confirmar
            </span>
            <input
              className={`${fieldClass} font-semibold tracking-[0.08em]`}
              value={palabra}
              autoComplete="off"
              autoFocus
              onChange={(e) => setPalabra(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && palabraOk && !enviando) void confirmar();
              }}
              placeholder={PALABRA}
            />
          </label>
          {error && <Alert kind="error">{error}</Alert>}
        </div>
        <div className="mt-7 flex justify-between gap-3">
          <PortalButton tone="quiet" icon="arrowLeft" onClick={() => setPaso(1)}>Atrás</PortalButton>
          <div className="flex gap-3">
            <PortalButton tone="ghost" onClick={onClose}>Cancelar</PortalButton>
            <PortalButton
              tone="danger"
              icon="repeat"
              disabled={!palabraOk}
              loading={enviando}
              onClick={confirmar}
            >
              Sí, reiniciar
            </PortalButton>
          </div>
        </div>
      </AlertaShell>
    </>
  );
}

/** La ventana de cada alerta: el mismo aspecto que ConfirmDialog en modo peligro, con el paso arriba. */
function AlertaShell({
  open,
  paso,
  titulo,
  onClose,
  children,
}: {
  open: boolean;
  paso: 1 | 2;
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}) {
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
          key={paso}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-isel-deep/60 p-4 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={titulo}
            className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-isel-line bg-white p-6 shadow-card-hover"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-isel-alert/10 text-isel-alert">
                <Icon name="alert" size={20} />
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-alert/80">
                Alerta {paso} de 2
              </span>
            </div>
            <h3 className="mb-3 mt-4 font-display text-[17px] font-semibold tracking-tightest text-isel-navy">{titulo}</h3>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
