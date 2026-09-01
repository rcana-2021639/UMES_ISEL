import { useEffect, useMemo, useState } from "react";
import { rangeFor, type RangeMode } from "@/lib/dateRanges";
import {
  deleteSolicitudTitulo,
  getSolicitudTitulo,
  getSolicitudesTitulo,
  marcarSolicitudEntregada,
  openSolicitudTituloPdf,
  openSolicitudesTituloBatchPdf,
} from "@/lib/solicitudTituloApi";
import { ApiError } from "@/lib/http";
import { useConfirm } from "@/hooks/useConfirm";
import { Icon } from "@/components/portal/Icon";
import { PortalPanel } from "@/components/portal/PortalShell";
import { Modal } from "@/components/ui/Modal";
import { Alert, Chip, EmptyState, IconButton, Loading, PortalButton, Segmented, fieldClass } from "@/components/portal/kit";
import { Th, Td, normalize, todayInput, rangeText } from "@/pages/portal/AdminPortalPage";
import { SolicitudTituloForm } from "@/components/titulo/SolicitudTituloForm";
import { CAMPUS_OPCIONES, type EstadoSolicitudTitulo, type SolicitudTitulo, type SolicitudTituloListItem } from "@/types/solicitudTitulo";

/**
 * Panel admin de "Solicitudes de título" — mismo par de secciones que ya existe para Asignaciones e
 * Inscripciones (impresión filtrable por fecha + tabla completa), sobre alumnos que están pidiendo
 * la impresión de su título.
 *
 * Lo propio de este trámite es que termina FUERA del sistema: la solicitud se imprime y se entrega
 * en Secretaría. Por eso la tabla no habla de "migrar" sino de "entregada", que es el único estado
 * que el sistema puede saber, y por eso lo más a mano de cada fila es imprimir.
 */
export function SolicitudesTituloAdminPanels() {
  const { confirm, dialog: confirmDialog } = useConfirm();

  // ---- Impresión por rango ----
  const [dateInput, setDateInput] = useState(todayInput());
  const [rangeMode, setRangeMode] = useState<RangeMode | null>(null);
  const [estadoFilter, setEstadoFilter] = useState<EstadoSolicitudTitulo>("todas");
  const [rangeItems, setRangeItems] = useState<SolicitudTituloListItem[]>([]);
  const [loadingRange, setLoadingRange] = useState(false);
  const [rangeLoaded, setRangeLoaded] = useState(false);
  const [rangeSearch, setRangeSearch] = useState("");
  const [printingId, setPrintingId] = useState<number | "batch" | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  async function loadRange(mode: RangeMode, estado: EstadoSolicitudTitulo = estadoFilter) {
    setRangeMode(mode);
    setLoadingRange(true);
    const { from, to } = rangeFor(mode, new Date(`${dateInput}T00:00:00`));
    try {
      setRangeItems(await getSolicitudesTitulo(from, to, estado));
      setRangeLoaded(true);
    } finally {
      setLoadingRange(false);
    }
  }

  function handleEstadoFilterChange(estado: EstadoSolicitudTitulo) {
    setEstadoFilter(estado);
    if (rangeMode) loadRange(rangeMode, estado);
  }

  const rangeLabel = useMemo(
    () => (rangeMode ? { day: "Hoy", week: "Esta semana", month: "Este mes" }[rangeMode] : null),
    [rangeMode],
  );
  const rangeDates = useMemo(() => {
    if (!rangeMode) return null;
    const { from, to } = rangeFor(rangeMode, new Date(`${dateInput}T00:00:00`));
    return rangeText(from, to);
  }, [rangeMode, dateInput]);

  const filteredRangeItems = useMemo(() => {
    const q = normalize(rangeSearch.trim());
    if (!q) return rangeItems;
    return rangeItems.filter(
      (s) => normalize(s.nombreCompletoAlumno).includes(q) || normalize(s.carnet).includes(q) || normalize(s.carreraAlumno).includes(q),
    );
  }, [rangeItems, rangeSearch]);

  async function handlePrintOne(item: SolicitudTituloListItem) {
    setPrintingId(item.id);
    setPrintError(null);
    try {
      await openSolicitudTituloPdf(item.id);
    } catch (e) {
      setPrintError(e instanceof ApiError ? e.message : "No se pudo generar el PDF.");
    } finally {
      setPrintingId(null);
    }
  }

  async function handlePrintAll() {
    if (!rangeMode) return;
    setPrintingId("batch");
    setPrintError(null);
    try {
      const { from, to } = rangeFor(rangeMode, new Date(`${dateInput}T00:00:00`));
      await openSolicitudesTituloBatchPdf(from, to, estadoFilter);
    } catch (e) {
      setPrintError(e instanceof ApiError ? e.message : "No se pudieron generar los PDF.");
    } finally {
      setPrintingId(null);
    }
  }

  // ---- Tabla completa ----
  const [solicitudes, setSolicitudes] = useState<SolicitudTituloListItem[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [search, setSearch] = useState("");

  async function loadSolicitudes() {
    setLoadingSolicitudes(true);
    try {
      setSolicitudes(await getSolicitudesTitulo());
    } finally {
      setLoadingSolicitudes(false);
    }
  }

  useEffect(() => {
    loadSolicitudes();
  }, []);

  function refreshAll() {
    loadSolicitudes();
    if (rangeMode) loadRange(rangeMode);
  }

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return solicitudes;
    return solicitudes.filter(
      (s) => normalize(s.nombreCompletoAlumno).includes(q) || normalize(s.carnet).includes(q) || normalize(s.carreraAlumno).includes(q),
    );
  }, [solicitudes, search]);

  async function handleDelete(item: SolicitudTituloListItem) {
    const ok = await confirm({
      title: "Eliminar solicitud",
      message: `¿Eliminar la solicitud de título de ${item.nombreCompletoAlumno}? Esta acción no se puede deshacer.`,
      confirmLabel: "Sí, eliminar",
      danger: true,
    });
    if (!ok) return;
    await deleteSolicitudTitulo(item.id);
    refreshAll();
  }

  async function handleEntregada(item: SolicitudTituloListItem) {
    await marcarSolicitudEntregada(item.id, !item.entregada);
    refreshAll();
  }

  // ---- Modal "Ver ficha" ----
  const [detalle, setDetalle] = useState<SolicitudTitulo | null>(null);
  const [editando, setEditando] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);

  async function openDetalle(item: SolicitudTituloListItem, edit: boolean) {
    setOpeningId(item.id);
    try {
      setDetalle(await getSolicitudTitulo(item.id));
      setEditando(edit);
    } finally {
      setOpeningId(null);
    }
  }

  const campusLabel = (v?: string | null) => CAMPUS_OPCIONES.find((c) => c.value === v)?.label ?? "—";

  return (
    <>
      <PortalPanel
        step="01"
        accent="#A97B18"
        title="Impresión de solicitudes de título"
        description="Elige una fecha ancla y el rango. La impresión masiva usa el rango cargado, no el texto que busques."
        actions={
          <PortalButton
            tone="primary"
            icon="printer"
            disabled={rangeItems.length === 0}
            loading={printingId === "batch"}
            onClick={handlePrintAll}
          >
            Imprimir todas
          </PortalButton>
        }
      >
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Fecha ancla</span>
            <input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} className={`${fieldClass} w-auto tabular`} />
          </label>
          <div>
            <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Rango</span>
            <Segmented
              value={rangeMode}
              onChange={(m) => loadRange(m)}
              options={[
                { value: "day" as RangeMode, label: "Hoy" },
                { value: "week" as RangeMode, label: "Semana" },
                { value: "month" as RangeMode, label: "Mes" },
              ]}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Estado</span>
            <Segmented
              value={estadoFilter}
              onChange={handleEstadoFilterChange}
              options={[
                { value: "todas" as const, label: "Todas" },
                { value: "completa" as const, label: "Completa" },
                { value: "pendiente" as const, label: "Pendiente" },
                { value: "entregada" as const, label: "Entregada" },
              ]}
            />
          </div>
        </div>

        {rangeLabel && rangeDates && (
          <p className="mt-4 text-[12.5px] text-isel-ink/50">
            <span className="font-semibold text-isel-navy">{rangeLabel}</span> — {rangeDates}
          </p>
        )}

        {printError && (
          <div className="mt-5">
            <Alert kind="error">{printError}</Alert>
          </div>
        )}

        {rangeLoaded && rangeItems.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-isel-ink/30" />
              <input
                value={rangeSearch}
                onChange={(e) => setRangeSearch(e.target.value)}
                placeholder="Buscar por carné, nombre o carrera…"
                className={`${fieldClass} pl-10`}
              />
            </div>
            <span className="tabular text-[12.5px] text-isel-ink/45">
              {rangeSearch ? `${filteredRangeItems.length} de ${rangeItems.length}` : `${rangeItems.length} solicitudes`}
            </span>
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-xl border border-isel-line">
          {!rangeLoaded ? (
            <EmptyState icon="calendar" title="Elige un rango para empezar" hint="Hoy, Semana o Mes carga las solicitudes alrededor de la fecha ancla." />
          ) : loadingRange ? (
            <Loading label="Cargando solicitudes" />
          ) : rangeItems.length === 0 ? (
            <EmptyState icon="file" title={`No hay solicitudes para ${rangeLabel?.toLowerCase()}.`} hint="Prueba con otro rango o con otro estado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-isel-line bg-isel-paper/60">
                    <Th>Carné</Th>
                    <Th>Alumno</Th>
                    <Th>Sede</Th>
                    <Th className="text-center">Estado</Th>
                    <Th className="text-right">Acciones</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-isel-line/70">
                  {filteredRangeItems.map((s) => (
                    <tr key={s.id} className="transition-colors duration-200 ease-crisp hover:bg-isel-paper/60">
                      <Td className="tabular font-semibold text-isel-navy">{s.carnet}</Td>
                      <Td>{s.nombreCompletoAlumno}</Td>
                      <Td className="text-isel-ink/65">{campusLabel(s.campus)}</Td>
                      <Td className="text-center">
                        <EstadoChip item={s} />
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <PortalButton
                            tone="ghost"
                            size="sm"
                            icon="printer"
                            loading={printingId === s.id}
                            disabled={printingId !== null && printingId !== s.id}
                            onClick={() => handlePrintOne(s)}
                          >
                            Imprimir
                          </PortalButton>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PortalPanel>

      <PortalPanel
        step="02"
        accent="#14493C"
        title="Alumnos que piden su título"
        description="Cada alumno tiene una sola solicitud viva. Márcala como entregada cuando Secretaría la reciba."
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-isel-ink/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por carné, nombre o carrera…"
              className={`${fieldClass} pl-10`}
            />
          </div>
          <PortalButton tone="ghost" icon="search" onClick={loadSolicitudes} loading={loadingSolicitudes}>
            Buscar
          </PortalButton>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-isel-line">
          {loadingSolicitudes ? (
            <Loading label="Cargando solicitudes" />
          ) : filtered.length === 0 ? (
            <EmptyState icon="users" title="Ninguna solicitud todavía" hint="Aquí aparecerán en cuanto un alumno abra la suya con su carné." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-isel-line bg-isel-paper/60">
                    <Th>Carné</Th>
                    <Th>Alumno</Th>
                    <Th>Carrera</Th>
                    <Th className="text-center">Ceremonia</Th>
                    <Th className="text-center">Estado</Th>
                    <Th className="text-right">Acciones</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-isel-line/70">
                  {filtered.map((s) => (
                    <tr key={s.id} className="transition-colors duration-200 ease-crisp hover:bg-isel-paper/60">
                      <Td className="tabular font-semibold text-isel-navy">{s.carnet}</Td>
                      <Td>{s.nombreCompletoAlumno}</Td>
                      <Td className="max-w-[22rem] truncate text-isel-ink/65">{s.carreraAlumno}</Td>
                      <Td className="text-center">
                        {s.participaCeremonia ? (
                          <Chip tone="gold" icon="check">Sí</Chip>
                        ) : (
                          <span className="text-isel-ink/25">No</span>
                        )}
                      </Td>
                      <Td className="text-center">
                        <EstadoChip item={s} />
                      </Td>
                      <Td>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <PortalButton tone="ghost" size="sm" icon="eye" loading={openingId === s.id} onClick={() => openDetalle(s, false)}>
                            Ver ficha
                          </PortalButton>
                          <IconButton icon="pencil" label={`Editar la solicitud de ${s.nombreCompletoAlumno}`} onClick={() => openDetalle(s, true)} />
                          <IconButton icon="printer" label={`Imprimir la solicitud de ${s.nombreCompletoAlumno}`} onClick={() => handlePrintOne(s)} />
                          <PortalButton
                            tone={s.entregada ? "ghost" : "accent"}
                            size="sm"
                            icon={s.entregada ? "repeat" : "check"}
                            onClick={() => handleEntregada(s)}
                          >
                            {s.entregada ? "Reabrir" : "Entregada"}
                          </PortalButton>
                          <IconButton icon="trash" tone="danger" label={`Eliminar la solicitud de ${s.nombreCompletoAlumno}`} onClick={() => handleDelete(s)} />
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PortalPanel>

      {detalle && (
        <Modal
          open
          onClose={() => setDetalle(null)}
          title={`Solicitud de título — ${detalle.nombreCompletoAlumno}`}
          widthClassName="max-w-4xl"
        >
          <div className="space-y-5">
            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors duration-500 ease-crisp ${
                editando ? "border-isel-gold/40 bg-isel-gold/10" : "border-isel-line bg-isel-paper/70"
              }`}
            >
              <p className="flex items-center gap-2.5 text-[13px] font-semibold text-isel-navy">
                <Icon name={editando ? "pencil" : "eye"} size={16} className="text-isel-gold2" />
                {editando ? "Estás editando esta solicitud" : "Estás consultando esta solicitud"}
                <span className="font-normal text-isel-ink/45">{editando ? "— guarda al terminar" : "— nada se puede modificar"}</span>
              </p>
              {editando ? (
                <PortalButton tone="ghost" size="sm" icon="close" onClick={() => setEditando(false)}>
                  Salir de edición
                </PortalButton>
              ) : (
                <PortalButton tone="primary" size="sm" icon="pencil" onClick={() => setEditando(true)}>
                  Editar solicitud
                </PortalButton>
              )}
            </div>

            <div className="max-h-[65vh] overflow-y-auto pr-1">
              <SolicitudTituloForm
                solicitud={detalle}
                readOnly={!editando}
                stickyActions={false}
                onSaved={(s) => {
                  setDetalle(s);
                  refreshAll();
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {confirmDialog}
    </>
  );
}

/** Verde = lista para imprimir; ámbar = le falta algo; gris = ya la recibió Secretaría. */
function EstadoChip({ item }: { item: SolicitudTituloListItem }) {
  if (item.entregada) {
    return <Chip tone="neutral" icon="check">Entregada</Chip>;
  }
  if (item.completa) {
    return <Chip tone="emerald" icon="check">Completa</Chip>;
  }
  const falta = [!item.tieneFoto && "foto", !item.tieneFirma && "firma"].filter(Boolean);
  return (
    <Chip tone="gold" icon="alert">
      {falta.length > 0 ? `Falta ${falta.join(" y ")}` : "Incompleta"}
    </Chip>
  );
}
