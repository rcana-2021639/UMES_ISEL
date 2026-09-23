import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/portal/Icon";
import { PortalPanel } from "@/components/portal/PortalShell";
import { Alert, Chip, EmptyState, Loading, PortalButton } from "@/components/portal/kit";
import { ApiError } from "@/lib/http";
import { descargarArchivoFichas, getArchivosFichas, type ArchivoFichas } from "@/lib/archivoFichasApi";

function tamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * «Archivo de fichas»: un ZIP por cada reinicio de asignaciones, con el PDF de
 * cada ficha y un listado en Excel.
 *
 * Existe para que las fichas de temporadas pasadas no dependan de la
 * computadora donde alguien las descargó: el ZIP se queda en el servidor y se
 * puede volver a bajar desde aquí cuando lo pidan.
 *
 * Mientras un archivo se genera, el panel vuelve a preguntar cada pocos
 * segundos; al terminar avisa a la página para que recargue la tabla de fichas,
 * que para entonces ya está vacía.
 */
export function ArchivoFichasPanel({ refreshKey, onTerminado }: { refreshKey: number; onTerminado: () => void }) {
  const [archivos, setArchivos] = useState<ArchivoFichas[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<number | null>(null);
  const generandoAntes = useRef(false);

  const cargar = useCallback(async () => {
    try {
      const lista = await getArchivosFichas();
      setArchivos(lista);
      setError(null);
      const generando = lista.some((a) => a.estado === "generando");
      if (generandoAntes.current && !generando) onTerminado();
      generandoAntes.current = generando;
    } catch {
      setError("No se pudo cargar el archivo de fichas.");
    }
  }, [onTerminado]);

  useEffect(() => {
    void cargar();
  }, [cargar, refreshKey]);

  const hayGenerando = archivos?.some((a) => a.estado === "generando") ?? false;
  useEffect(() => {
    if (!hayGenerando) return;
    const id = window.setInterval(() => void cargar(), 4000);
    return () => window.clearInterval(id);
  }, [hayGenerando, cargar]);

  async function descargar(a: ArchivoFichas) {
    setDescargando(a.id);
    setError(null);
    try {
      await descargarArchivoFichas(a);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo descargar el ZIP.");
    } finally {
      setDescargando(null);
    }
  }

  return (
    <PortalPanel
      step="03"
      accent="#6B4E8C"
      title="Archivo de fichas"
      description="Cada vez que se reinician las asignaciones, los PDF de las fichas se guardan aquí en un ZIP. Se quedan en el servidor: se pueden volver a descargar cuando hagan falta."
    >
      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-isel-line">
        {archivos === null ? (
          <Loading label="Cargando archivo" />
        ) : archivos.length === 0 ? (
          <EmptyState
            icon="archive"
            title="Todavía no hay fichas archivadas"
            hint="Aparecerán aquí al pulsar «Reiniciar asignaciones»."
          />
        ) : (
          <ul className="divide-y divide-isel-line">
            {archivos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-4 sm:px-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-isel-navy/[0.06] text-isel-navy">
                  <Icon name="archive" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-isel-navy">{a.etiqueta}</p>
                  <p className="tabular text-[12.5px] text-isel-ink/50">
                    {a.cantidadFichas} fichas · {fecha(a.creadoEn)} · por {a.creadoPor}
                    {a.estado === "listo" && a.bytes > 0 ? ` · ${tamano(a.bytes)}` : ""}
                  </p>
                  {a.error && (
                    <p className={`mt-1 text-[12.5px] ${a.estado === "error" ? "text-isel-alert" : "text-isel-ink/60"}`}>
                      {a.error}
                    </p>
                  )}
                </div>
                {a.estado === "generando" ? (
                  <Chip tone="gold" icon="repeat">Generando ZIP…</Chip>
                ) : a.estado === "error" ? (
                  <Chip tone="alert" icon="alert">No se completó</Chip>
                ) : a.disponible ? (
                  <PortalButton
                    tone="ghost"
                    size="sm"
                    icon="download"
                    loading={descargando === a.id}
                    onClick={() => descargar(a)}
                  >
                    Descargar ZIP
                  </PortalButton>
                ) : (
                  <Chip tone="neutral" icon="alert">ZIP no encontrado</Chip>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PortalPanel>
  );
}
