import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/http";
import {
  descargarArchivo,
  getResumen,
  importarAlumnos,
  type ImportResult,
  type Resumen,
} from "@/lib/adminToolsApi";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/portal/Icon";
import { PortalPanel } from "@/components/portal/PortalShell";
import { Alert, Chip, EmptyState, Loading, PortalButton } from "@/components/portal/kit";
import { Td, Th } from "@/pages/portal/AdminPortalPage";

/**
 * Pestaña "Inicio" del panel.
 *
 * Responde de un vistazo las preguntas que antes obligaban a entrar en cada
 * pestaña a contar a mano: cuántas fichas entraron hoy, a cuánta gente le falta
 * papelería, cuántos aspirantes quedaron a medias, y si el respaldo de anoche
 * corrió.
 *
 * Debajo van las dos operaciones de datos en bloque: sacarlos a Excel y meterlos
 * desde el Excel del trimestre.
 */
export function InicioAdminPanels() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    getResumen()
      .then((r) => vivo && setResumen(r))
      .catch((e) => vivo && setError(e instanceof ApiError ? e.message : "No se pudo cargar el resumen."));
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <>
      <PortalPanel
        step="01"
        accent="#12855C"
        title="Resumen"
        description="Cómo va el trimestre, sin tener que entrar a contar en cada pestaña."
      >
        {error && <Alert kind="error">{error}</Alert>}

        {!resumen ? (
          <div className="overflow-hidden rounded-xl border border-isel-line">
            <Loading label="Cargando el resumen" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Cifra label="Alumnos" valor={resumen.totalAlumnos} icon="users" />
              <Cifra label="Fichas hoy" valor={resumen.fichasHoy} sub={`${resumen.fichasEstaSemana} esta semana`} icon="file" />
              <Cifra
                label="Papelería pendiente"
                valor={resumen.papeleriaPendiente}
                icon="alert"
                tono={resumen.papeleriaPendiente > 0 ? "gold" : "emerald"}
              />
              <Cifra
                label="Aspirantes a medias"
                valor={resumen.aspirantesEnProceso}
                sub={`${resumen.aspirantesCompletos} completos`}
                icon="layers"
              />
              <Cifra label="Títulos pendientes" valor={resumen.solicitudesTituloPendientes} icon="pen" />
              <Cifra label="Fichas guardadas" valor={resumen.totalFichas} icon="save" />
              <Cifra
                label="Alertas (7 días)"
                valor={resumen.alertasSeguridad7Dias}
                icon="lock"
                tono={resumen.alertasSeguridad7Dias > 20 ? "alert" : "neutral"}
              />
              <UltimoRespaldo fecha={resumen.ultimoRespaldo} />
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-isel-line">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-[13.5px]">
                  <thead>
                    <tr className="border-b border-isel-line bg-isel-paper/60">
                      <Th>Carrera</Th>
                      <Th className="text-center">Alumnos</Th>
                      <Th className="text-center">Fichas</Th>
                      <Th className="text-center">Aspirantes</Th>
                      <Th className="text-center">Títulos</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-isel-line/70">
                    {resumen.porCarrera.map((c) => (
                      <tr key={c.carrera} className="transition-colors duration-200 ease-crisp hover:bg-isel-paper/60">
                        <Td>{c.carrera}</Td>
                        <Td className="tabular text-center font-semibold text-isel-navy">{c.alumnos}</Td>
                        <Td className="tabular text-center text-isel-ink/65">{c.fichas}</Td>
                        <Td className="tabular text-center text-isel-ink/65">{c.aspirantes}</Td>
                        <Td className="tabular text-center text-isel-ink/65">{c.solicitudesTitulo}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </PortalPanel>

      <ExportarPanel />
      <ImportarPanel onImportado={() => getResumen().then(setResumen).catch(() => {})} />
    </>
  );
}

function Cifra({
  label,
  valor,
  sub,
  icon,
  tono = "neutral",
}: {
  label: string;
  valor: number;
  sub?: string;
  icon: Parameters<typeof Icon>[0]["name"];
  tono?: "neutral" | "gold" | "emerald" | "alert";
}) {
  const color = {
    neutral: "text-isel-navy",
    gold: "text-isel-gold2",
    emerald: "text-isel-emerald2",
    alert: "text-isel-alert",
  }[tono];

  return (
    <div className="rounded-xl border border-isel-line bg-white px-4 py-3.5">
      <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-isel-ink/45">
        <Icon name={icon} size={13} />
        {label}
      </p>
      <p className={`tabular mt-2 font-display text-[1.75rem] font-semibold leading-none ${color}`}>{valor}</p>
      {sub && <p className="mt-1.5 text-[11.5px] text-isel-ink/40">{sub}</p>}
    </div>
  );
}

/** El respaldo importa tanto como las cifras: si dejó de correr, hay que verlo aquí. */
function UltimoRespaldo({ fecha }: { fecha: string | null }) {
  const dias = fecha ? Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000) : null;
  const alarma = dias === null || dias >= 2;

  return (
    <div className={`rounded-xl border px-4 py-3.5 ${alarma ? "border-isel-alert/30 bg-isel-alert/[0.05]" : "border-isel-line bg-white"}`}>
      <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-isel-ink/45">
        <Icon name="save" size={13} />
        Último respaldo
      </p>
      <p className={`mt-2 font-display text-[1.1rem] font-semibold leading-tight ${alarma ? "text-isel-alert" : "text-isel-emerald2"}`}>
        {fecha === null ? "Ninguno todavía" : dias === 0 ? "Hoy" : dias === 1 ? "Ayer" : `Hace ${dias} días`}
      </p>
      {fecha && <p className="mt-1 text-[11.5px] text-isel-ink/40">{new Date(fecha).toLocaleString("es-GT")}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- exportar */

function ExportarPanel() {
  const [bajando, setBajando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function bajar(clave: string, path: string, nombre: string) {
    setBajando(clave);
    setError(null);
    try {
      await descargarArchivo(path, nombre);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo generar el archivo.");
    } finally {
      setBajando(null);
    }
  }

  return (
    <PortalPanel
      step="02"
      accent="#1F6FB8"
      title="Exportar a Excel"
      description="Los datos salen en CSV con separador de punto y coma y codificación UTF-8, que es lo que Excel en español abre sin romper las tildes."
    >
      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      <div className="flex flex-wrap gap-2.5">
        <PortalButton
          tone="ghost"
          icon="users"
          loading={bajando === "alumnos"}
          onClick={() => bajar("alumnos", "/api/admin/exportar/alumnos.csv", "alumnos.csv")}
        >
          Alumnos
        </PortalButton>
        <PortalButton
          tone="ghost"
          icon="file"
          loading={bajando === "asignaciones"}
          onClick={() => bajar("asignaciones", "/api/admin/exportar/asignaciones.csv", "asignaciones.csv")}
        >
          Fichas de asignación
        </PortalButton>
        <PortalButton
          tone="ghost"
          icon="layers"
          loading={bajando === "inscripciones"}
          onClick={() => bajar("inscripciones", "/api/admin/exportar/inscripciones.csv", "inscripciones.csv")}
        >
          Inscripciones
        </PortalButton>
      </div>
      <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-isel-ink/45">
        <Icon name="info" size={14} className="mt-0.5 shrink-0" />
        Cada exportación queda anotada en la bitácora de seguridad, con quién la hizo y cuándo.
      </p>
    </PortalPanel>
  );
}

/* ---------------------------------------------------------------- importar */

function ImportarPanel({ onImportado }: { onImportado: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<ImportResult | null>(null);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegir(file: File | null) {
    setArchivo(file);
    setPrevia(null);
    setResultado(null);
    setError(null);
    if (!file) return;

    setCargando(true);
    try {
      // Siempre en seco primero: nadie confirma una carga masiva sin ver antes
      // qué va a pasar.
      setPrevia(await importarAlumnos(file, true));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo leer el archivo.");
    } finally {
      setCargando(false);
    }
  }

  async function confirmar() {
    if (!archivo) return;
    setCargando(true);
    setError(null);
    try {
      setResultado(await importarAlumnos(archivo, false));
      setPrevia(null);
      onImportado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo completar la carga.");
    } finally {
      setCargando(false);
    }
  }

  function limpiar() {
    setArchivo(null);
    setPrevia(null);
    setResultado(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <PortalPanel
        step="03"
        accent="#B8791F"
        title="Cargar alumnos desde el Excel"
        description="Sube el Excel (.xlsx) o el CSV del trimestre. Nunca borra a nadie: da de alta los carnés nuevos y actualiza los que ya están, dejando en paz lo que el archivo traiga vacío."
      >
        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => elegir(e.target.files?.[0] ?? null)}
            className="block w-full max-w-md text-[13px] text-isel-ink/70 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-isel-line file:bg-white file:px-3.5 file:py-2 file:text-[12.5px] file:font-semibold file:text-isel-navy hover:file:border-isel-navy/35"
          />
          {archivo && (
            <PortalButton tone="ghost" size="sm" icon="close" onClick={limpiar}>
              Quitar
            </PortalButton>
          )}
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-isel-line">
          {cargando ? (
            <Loading label={previa ? "Guardando" : "Revisando el archivo"} />
          ) : resultado ? (
            <ResumenImportacion resultado={resultado} />
          ) : !archivo ? (
            <EmptyState
              icon="upload"
              title="Elige el archivo del trimestre"
              hint="La primera fila tiene que ser la de encabezados. Reconoce «Carné», «Nombre Completo», «Carrera», «Sección», «Trimestre», los dos correos y el celular, escritos con o sin tildes."
            />
          ) : null}
        </div>
      </PortalPanel>

      {/* La confirmación va en una ventana propia: es la operación con más
          capacidad de destrozo del panel y no puede compartir pantalla con el
          resto, donde se confirma sin leer. */}
      {previa && (
        <Modal open onClose={limpiar} title="Revisa antes de guardar" widthClassName="max-w-2xl">
          <p className="text-[13.5px] leading-relaxed text-isel-ink/65">
            Se leyeron <b className="text-isel-navy">{previa.filasLeidas}</b> filas de{" "}
            <b className="text-isel-navy">{archivo?.name}</b>. Todavía <b>no se ha guardado nada</b>.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <MiniCifra label="Altas" valor={previa.nuevosAlumnos} tono="emerald" />
            <MiniCifra label="Actualizaciones" valor={previa.actualizados} tono="neutral" />
            <MiniCifra label="Se omiten" valor={previa.omitidos} tono={previa.omitidos > 0 ? "gold" : "neutral"} />
          </div>

          {previa.problemas.length > 0 && (
            <div className="mt-5 max-h-56 overflow-y-auto rounded-xl border border-isel-line">
              <table className="w-full border-collapse text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-isel-line bg-isel-paper/60">
                    <Th className="text-center">Fila</Th>
                    <Th>Carné</Th>
                    <Th>Motivo</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-isel-line/70">
                  {previa.problemas.map((p, i) => (
                    <tr key={`${p.fila}-${i}`}>
                      <Td className="tabular text-center text-isel-ink/50">{p.fila}</Td>
                      <Td className="tabular font-semibold text-isel-navy">{p.carnet}</Td>
                      <Td className="text-isel-ink/65">{p.motivo}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <PortalButton tone="ghost" onClick={limpiar}>
              Cancelar
            </PortalButton>
            <PortalButton
              tone="accent"
              icon="save"
              loading={cargando}
              disabled={previa.nuevosAlumnos + previa.actualizados === 0}
              onClick={confirmar}
            >
              Guardar {previa.nuevosAlumnos + previa.actualizados} cambios
            </PortalButton>
          </div>
        </Modal>
      )}
    </>
  );
}

function ResumenImportacion({ resultado }: { resultado: ImportResult }) {
  return (
    <div className="px-5 py-6">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-isel-emerald2">
        <Icon name="check" size={16} />
        Carga completada
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <MiniCifra label="Altas" valor={resultado.nuevosAlumnos} tono="emerald" />
        <MiniCifra label="Actualizaciones" valor={resultado.actualizados} tono="neutral" />
        <MiniCifra label="Omitidas" valor={resultado.omitidos} tono={resultado.omitidos > 0 ? "gold" : "neutral"} />
      </div>
    </div>
  );
}

function MiniCifra({ label, valor, tono }: { label: string; valor: number; tono: "neutral" | "emerald" | "gold" }) {
  const cls = {
    neutral: "border-isel-line bg-white text-isel-navy",
    emerald: "border-isel-emerald/25 bg-isel-emerald/[0.07] text-isel-emerald2",
    gold: "border-isel-gold/30 bg-isel-gold/[0.08] text-isel-gold2",
  }[tono];

  return (
    <div className={`rounded-xl border px-3.5 py-3 text-center ${cls}`}>
      <p className="tabular font-display text-[1.5rem] font-semibold leading-none">{valor}</p>
      <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] opacity-70">{label}</p>
    </div>
  );
}

export { Chip };
