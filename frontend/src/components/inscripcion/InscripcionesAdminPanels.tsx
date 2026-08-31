import { useEffect, useMemo, useState } from "react";
import { rangeFor, type RangeMode } from "@/lib/dateRanges";
import {
  deleteApplicant,
  getApplicant,
  getApplicants,
  openInscripcionCompletaPdf,
  openInscripcionesBatchPdf,
  type EstadoInscripcion,
} from "@/lib/inscripcionesApi";
import { ApiError } from "@/lib/http";
import { useConfirm } from "@/hooks/useConfirm";
import { Icon } from "@/components/portal/Icon";
import { PortalPanel } from "@/components/portal/PortalShell";
import { Alert, Chip, EmptyState, IconButton, Loading, PortalButton, Segmented, fieldClass } from "@/components/portal/kit";
import { Th, Td, normalize, todayInput, rangeText } from "@/pages/portal/AdminPortalPage";
import { AspiranteFichasModal } from "@/components/inscripcion/AspiranteFichasModal";
import { MigrarAspiranteModal } from "@/components/inscripcion/MigrarAspiranteModal";
import type { Applicant, ApplicantListItem } from "@/types/inscripcion";

/**
 * Panel admin de "Inscripciones" — mismo par de secciones que ya existe para Asignaciones
 * (Impresión filtrable por fecha + tabla de la lista completa), sobre aspirantes de nuevo ingreso en
 * vez de sobre alumnos ya asignados. Vive aparte de AdminPortalPage.tsx para no inflar ese archivo —
 * se monta tal cual dentro del selector "Asignaciones / Inscripciones".
 */
export function InscripcionesAdminPanels() {
  const { confirm, dialog: confirmDialog } = useConfirm();

  // ---- Impresión de inscripciones ----
  const [dateInput, setDateInput] = useState(todayInput());
  const [rangeMode, setRangeMode] = useState<RangeMode | null>(null);
  const [estadoFilter, setEstadoFilter] = useState<EstadoInscripcion>("todas");
  const [rangeItems, setRangeItems] = useState<ApplicantListItem[]>([]);
  const [loadingRange, setLoadingRange] = useState(false);
  const [rangeLoaded, setRangeLoaded] = useState(false);
  const [rangeSearch, setRangeSearch] = useState("");
  const [printingId, setPrintingId] = useState<number | "batch" | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  async function loadRange(mode: RangeMode, estado: EstadoInscripcion = estadoFilter) {
    setRangeMode(mode);
    setLoadingRange(true);
    const anchor = new Date(`${dateInput}T00:00:00`);
    const { from, to } = rangeFor(mode, anchor);
    try {
      const results = await getApplicants(from, to, estado);
      setRangeItems(results);
      setRangeLoaded(true);
    } finally {
      setLoadingRange(false);
    }
  }

  function handleEstadoFilterChange(estado: EstadoInscripcion) {
    setEstadoFilter(estado);
    if (rangeMode) loadRange(rangeMode, estado);
  }

  const rangeLabel = useMemo(() => (rangeMode ? { day: "Hoy", week: "Esta semana", month: "Este mes" }[rangeMode] : null), [rangeMode]);
  const rangeDates = useMemo(() => {
    if (!rangeMode) return null;
    const { from, to } = rangeFor(rangeMode, new Date(`${dateInput}T00:00:00`));
    return rangeText(from, to);
  }, [rangeMode, dateInput]);

  const filteredRangeItems = useMemo(() => {
    const q = normalize(rangeSearch.trim());
    if (!q) return rangeItems;
    return rangeItems.filter((a) => normalize(a.nombreCompleto).includes(q) || (a.dpi && normalize(a.dpi).includes(q)) || (a.carrera && normalize(a.carrera).includes(q)));
  }, [rangeItems, rangeSearch]);

  async function handlePrintOne(item: ApplicantListItem) {
    setPrintingId(item.id);
    setPrintError(null);
    try {
      await openInscripcionCompletaPdf(item.id);
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
      const anchor = new Date(`${dateInput}T00:00:00`);
      const { from, to } = rangeFor(rangeMode, anchor);
      await openInscripcionesBatchPdf(from, to, estadoFilter);
    } catch (e) {
      setPrintError(e instanceof ApiError ? e.message : "No se pudo generar el PDF de las inscripciones.");
    } finally {
      setPrintingId(null);
    }
  }

  // ---- Aspirantes (tabla completa, sin filtro de fecha) ----
  const [aspirantes, setAspirantes] = useState<ApplicantListItem[]>([]);
  const [loadingAspirantes, setLoadingAspirantes] = useState(false);
  const [aspiranteSearch, setAspiranteSearch] = useState("");

  async function loadAspirantes() {
    setLoadingAspirantes(true);
    try {
      setAspirantes(await getApplicants());
    } finally {
      setLoadingAspirantes(false);
    }
  }

  useEffect(() => {
    loadAspirantes();
  }, []);

  function refreshAll() {
    loadAspirantes();
    if (rangeMode) loadRange(rangeMode);
  }

  const filteredAspirantes = useMemo(() => {
    const q = normalize(aspiranteSearch.trim());
    if (!q) return aspirantes;
    return aspirantes.filter((a) => normalize(a.nombreCompleto).includes(q) || (a.dpi && normalize(a.dpi).includes(q)) || (a.carrera && normalize(a.carrera).includes(q)));
  }, [aspirantes, aspiranteSearch]);

  async function handleDelete(item: ApplicantListItem) {
    const ok = await confirm({
      title: "Eliminar inscripción",
      message: `¿Estás seguro que deseas eliminar la inscripción de ${item.nombreCompleto}? Esta acción no se puede deshacer.`,
      confirmLabel: "Sí, eliminar",
      danger: true,
    });
    if (!ok) return;
    await deleteApplicant(item.id);
    refreshAll();
  }

  // ---- Modal "Ver fichas" / "Editar" ----
  const [fichasApplicant, setFichasApplicant] = useState<Applicant | null>(null);
  const [fichasEdit, setFichasEdit] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);

  async function openFichas(item: ApplicantListItem, edit: boolean) {
    setOpeningId(item.id);
    try {
      const full = await getApplicant(item.id);
      setFichasApplicant(full);
      setFichasEdit(edit);
    } finally {
      setOpeningId(null);
    }
  }

  // ---- Modal "Agregar a la base de datos" ----
  const [migrarApplicant, setMigrarApplicant] = useState<Applicant | null>(null);

  return (
    <>
      <PortalPanel
        step="01"
        accent="#B8791F"
        title="Impresión de inscripciones"
        description="Elige una fecha ancla y el rango que quieres revisar. La impresión masiva usa el rango cargado, no el texto que busques."
        actions={
          <PortalButton tone="primary" icon="printer" disabled={rangeItems.length === 0} loading={printingId === "batch"} onClick={handlePrintAll}>
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
              options={[{ value: "day" as RangeMode, label: "Hoy" }, { value: "week" as RangeMode, label: "Semana" }, { value: "month" as RangeMode, label: "Mes" }]}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Inscripción</span>
            <Segmented
              value={estadoFilter}
              onChange={handleEstadoFilterChange}
              options={[{ value: "todas" as const, label: "Todas" }, { value: "completa" as const, label: "Completa" }, { value: "pendiente" as const, label: "Pendiente" }]}
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
                placeholder="Buscar por DPI, nombre o carrera…"
                className={`${fieldClass} pl-10`}
              />
            </div>
            <span className="tabular text-[12.5px] text-isel-ink/45">
              {rangeSearch ? `${filteredRangeItems.length} de ${rangeItems.length}` : `${rangeItems.length} inscripciones`}
            </span>
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-xl border border-isel-line">
          {!rangeLoaded ? (
            <EmptyState icon="calendar" title="Elige un rango para empezar" hint="Hoy, Semana o Mes carga las inscripciones alrededor de la fecha ancla." />
          ) : loadingRange ? (
            <Loading label="Cargando inscripciones" />
          ) : rangeItems.length === 0 ? (
            <EmptyState icon="file" title={`No hay inscripciones para ${rangeLabel?.toLowerCase()}.`} hint="Prueba con otro rango o con otro estado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-isel-line bg-isel-paper/60">
                    <Th>Carné</Th>
                    <Th>Aspirante</Th>
                    <Th>Carrera</Th>
                    <Th className="text-center">Estado</Th>
                    <Th className="text-right">Acciones</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-isel-line/70">
                  {filteredRangeItems.map((a) => (
                    <tr key={a.id} className="transition-colors duration-200 ease-crisp hover:bg-isel-paper/60">
                      <Td className="tabular font-semibold text-isel-navy">{a.dpi || a.pasaporte || "—"}</Td>
                      <Td>{a.nombreCompleto}</Td>
                      <Td className="text-isel-ink/65">{a.carrera || "—"}</Td>
                      <Td className="text-center"><EstadoChip item={a} /></Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <PortalButton tone="ghost" size="sm" icon="printer" loading={printingId === a.id} disabled={printingId !== null && printingId !== a.id} onClick={() => handlePrintOne(a)}>
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
        accent="#12855C"
        title="Aspirantes"
        description="Nuevo ingreso — todavía sin carné ni sección hasta que se agreguen a la base de datos."
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-isel-ink/30" />
            <input
              value={aspiranteSearch}
              onChange={(e) => setAspiranteSearch(e.target.value)}
              placeholder="Buscar por DPI, nombre o carrera…"
              className={`${fieldClass} pl-10`}
            />
          </div>
          <PortalButton tone="ghost" icon="search" onClick={loadAspirantes} loading={loadingAspirantes}>Buscar</PortalButton>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-isel-line">
          {loadingAspirantes ? (
            <Loading label="Cargando aspirantes" />
          ) : filteredAspirantes.length === 0 ? (
            <EmptyState icon="users" title="Ningún aspirante todavía" hint="Aquí aparecerán en cuanto alguien empiece su inscripción." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-isel-line bg-isel-paper/60">
                    <Th>Carné</Th>
                    <Th>Aspirante</Th>
                    <Th>Sección</Th>
                    <Th className="text-center">Tri</Th>
                    <Th className="text-center">Documentos</Th>
                    <Th className="text-right">Acciones</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-isel-line/70">
                  {filteredAspirantes.map((a) => (
                    <tr key={a.id} className="transition-colors duration-200 ease-crisp hover:bg-isel-paper/60">
                      <Td className="tabular text-isel-ink/45">— (sin carné)</Td>
                      <Td className="font-semibold text-isel-navy">{a.nombreCompleto}</Td>
                      <Td className="text-isel-ink/65">{a.seccion || "—"}</Td>
                      <Td className="tabular text-center text-isel-ink/65">{a.trimestre ?? "—"}</Td>
                      <Td className="text-center"><EstadoChip item={a} /></Td>
                      <Td>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <PortalButton tone="ghost" size="sm" icon="eye" loading={openingId === a.id} onClick={() => openFichas(a, false)}>Ver fichas</PortalButton>
                          <IconButton icon="pencil" label={`Editar a ${a.nombreCompleto}`} onClick={() => openFichas(a, true)} />
                          <IconButton icon="printer" label={`Imprimir la inscripción de ${a.nombreCompleto}`} onClick={() => handlePrintOne(a)} />
                          <PortalButton
                            tone="accent"
                            size="sm"
                            icon="check"
                            disabled={!a.fichaCompleta}
                            title={a.fichaCompleta ? undefined : "Faltan fichas por completar"}
                            onClick={() => getApplicant(a.id).then(setMigrarApplicant)}
                          >
                            Agregar a BD
                          </PortalButton>
                          <IconButton icon="trash" tone="danger" label={`Eliminar a ${a.nombreCompleto}`} onClick={() => handleDelete(a)} />
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

      {fichasApplicant && (
        <AspiranteFichasModal
          applicant={fichasApplicant}
          open
          startInEdit={fichasEdit}
          onClose={() => setFichasApplicant(null)}
          onUpdated={(updated) => {
            setFichasApplicant(updated);
            refreshAll();
          }}
        />
      )}

      {migrarApplicant && (
        <MigrarAspiranteModal
          applicant={migrarApplicant}
          open
          onClose={() => setMigrarApplicant(null)}
          onMigrated={() => {
            setMigrarApplicant(null);
            refreshAll();
          }}
        />
      )}

      {confirmDialog}
    </>
  );
}

/** Verde = todos los documentos requeridos subidos; amarillo = algunos; rojo = ninguno. */
function EstadoChip({ item }: { item: ApplicantListItem }) {
  if (item.documentosSubidos === 0) {
    return <Chip tone="alert" icon="alert">Sin documentos</Chip>;
  }
  if (item.documentosSubidos >= item.documentosRequeridos) {
    return <Chip tone="emerald" icon="check">Completo</Chip>;
  }
  return (
    <Chip tone="gold" icon="file">
      {item.documentosSubidos}/{item.documentosRequeridos}
    </Chip>
  );
}
