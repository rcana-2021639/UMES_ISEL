import { useEffect, useState } from "react";
import { ApiError } from "@/lib/http";
import { getSession, type AdminUser } from "@/lib/auth";
import {
  actualizarAdminUser,
  crearAdminUser,
  crearRespaldo,
  descargarArchivo,
  eliminarAdminUser,
  getAdminUsers,
  getBitacora,
  getRespaldos,
  resetAdminPassword,
  type BackupInfo,
  type SecurityEvent,
} from "@/lib/adminToolsApi";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/hooks/useConfirm";
import { Icon } from "@/components/portal/Icon";
import { PortalPanel } from "@/components/portal/PortalShell";
import { Alert, Chip, EmptyState, Field, IconButton, Loading, PortalButton, Segmented, fieldClass } from "@/components/portal/kit";
import { Td, Th } from "@/pages/portal/AdminPortalPage";

/** Etiquetas legibles para los tipos de suceso que guarda la bitácora. */
const ETIQUETAS: Record<string, string> = {
  "login.admin.ok": "Entró un administrador",
  "login.admin.fallido": "Contraseña de admin incorrecta",
  "login.admin.bloqueado": "Cuenta bloqueada por intentos",
  "login.alumno.ok": "Entró un alumno",
  "login.alumno.fallido": "Acceso de alumno fallido",
  "acceso.inscripcion": "Abrió su inscripción",
  "acceso.titulo": "Abrió su solicitud de título",
  "acceso.titulo.fallido": "Acceso a título fallido",
  "admin.creado": "Cuenta creada",
  "admin.modificado": "Cuenta modificada",
  "admin.password.cambiada": "Contraseña cambiada",
  "registro.eliminado": "Se eliminó un registro",
  "datos.exportados": "Se exportaron datos",
  "datos.importados": "Se importaron datos",
  "pensum.modificado": "Se modificó el pénsum",
  "respaldo.creado": "Respaldo creado",
  "respaldo.descargado": "Respaldo descargado",
};

/**
 * Pestaña "Seguridad": las cuentas del panel, la bitácora y los respaldos.
 *
 * Las tres cosas van juntas porque responden la misma pregunta —quién puede
 * entrar, qué se ha hecho, y qué pasa si algo sale mal— y porque así hay un solo
 * sitio al que ir cuando algo huele raro.
 */
export function SeguridadAdminPanels() {
  return (
    <>
      <CuentasPanel />
      <BitacoraPanel />
      <RespaldosPanel />
    </>
  );
}

/* ----------------------------------------------------------------- cuentas */

function CuentasPanel() {
  const { confirm, dialog } = useConfirm();
  const [cuentas, setCuentas] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nuevaOpen, setNuevaOpen] = useState(false);
  // La contraseña temporal solo existe en este momento: el servidor guarda su
  // hash y no puede volver a decirla. Se enseña una vez y con un aviso.
  const [temporal, setTemporal] = useState<{ usuario: string; password: string } | null>(null);

  const yo = getSession()?.admin?.id;

  const cargar = () =>
    getAdminUsers()
      .then(setCuentas)
      .catch((e) => setError(e instanceof ApiError ? e.message : "No se pudieron cargar las cuentas."));

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function correr(accion: () => Promise<unknown>, fallo: string) {
    setBusy(true);
    setError(null);
    try {
      await accion();
      await cargar();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : fallo);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PortalPanel
        step="01"
        accent="#5B4B9E"
        title="Cuentas del panel"
        description="Quién puede entrar a administrar. Cada quien con su cuenta: así se sabe quién hizo cada cosa y se le puede quitar el acceso a una persona sin cambiarle la contraseña a todas."
        actions={
          <PortalButton tone="accent" icon="plus" disabled={busy} onClick={() => setNuevaOpen(true)}>
            Agregar cuenta
          </PortalButton>
        }
      >
        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-isel-line">
          {!cuentas ? (
            <Loading label="Cargando cuentas" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-isel-line bg-isel-paper/60">
                    <Th>Usuario</Th>
                    <Th>Nombre</Th>
                    <Th>Estado</Th>
                    <Th>Último acceso</Th>
                    <Th className="text-right">Acciones</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-isel-line/70">
                  {cuentas.map((c) => (
                    <tr key={c.id} className="transition-colors duration-200 ease-crisp hover:bg-isel-paper/60">
                      <Td className="font-semibold text-isel-navy">
                        {c.username}
                        {c.id === yo && <span className="ml-2 text-[11px] font-normal text-isel-ink/40">(tú)</span>}
                      </Td>
                      <Td className="text-isel-ink/65">{c.nombreCompleto}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1.5">
                          <Chip tone={c.activo ? "emerald" : "neutral"} icon={c.activo ? "check" : "lock"}>
                            {c.activo ? "Activa" : "Desactivada"}
                          </Chip>
                          {c.debeCambiarPassword && <Chip tone="gold">Contraseña temporal</Chip>}
                        </div>
                      </Td>
                      <Td className="text-isel-ink/50">
                        {c.ultimoAcceso ? new Date(c.ultimoAcceso).toLocaleString("es-GT") : "Nunca"}
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <PortalButton
                            tone="ghost"
                            size="sm"
                            icon="repeat"
                            disabled={busy}
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Reiniciar la contraseña",
                                message: `Se generará una contraseña temporal para «${c.username}». La actual dejará de servir de inmediato.`,
                                confirmLabel: "Sí, reiniciar",
                              });
                              if (!ok) return;
                              await correr(async () => {
                                const r = await resetAdminPassword(c.id);
                                setTemporal({ usuario: c.username, password: r.passwordTemporal });
                              }, "No se pudo reiniciar la contraseña.");
                            }}
                          >
                            Contraseña
                          </PortalButton>
                          <PortalButton
                            tone="ghost"
                            size="sm"
                            icon={c.activo ? "lock" : "check"}
                            disabled={busy || c.id === yo}
                            onClick={() =>
                              correr(
                                () => actualizarAdminUser(c.id, { nombreCompleto: c.nombreCompleto, activo: !c.activo }),
                                "No se pudo cambiar el estado.",
                              )
                            }
                          >
                            {c.activo ? "Desactivar" : "Activar"}
                          </PortalButton>
                          <IconButton
                            icon="trash"
                            tone="danger"
                            label={`Eliminar ${c.username}`}
                            disabled={busy || c.id === yo}
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Eliminar cuenta",
                                message: `Se eliminará la cuenta «${c.username}». Lo que ya hizo sigue en la bitácora.`,
                                confirmLabel: "Sí, eliminar",
                                danger: true,
                              });
                              if (ok) await correr(() => eliminarAdminUser(c.id), "No se pudo eliminar la cuenta.");
                            }}
                          />
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

      {nuevaOpen && (
        <NuevaCuentaModal
          busy={busy}
          onClose={() => setNuevaOpen(false)}
          onCrear={async (username, nombreCompleto) => {
            const ok = await correr(async () => {
              const r = await crearAdminUser({ username, nombreCompleto });
              setTemporal({ usuario: username, password: r.passwordTemporal });
            }, "No se pudo crear la cuenta.");
            if (ok) setNuevaOpen(false);
          }}
        />
      )}

      {temporal && <PasswordTemporalModal datos={temporal} onClose={() => setTemporal(null)} />}
      {dialog}
    </>
  );
}

function NuevaCuentaModal({
  busy,
  onClose,
  onCrear,
}: {
  busy: boolean;
  onClose: () => void;
  onCrear: (username: string, nombreCompleto: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [nombre, setNombre] = useState("");

  return (
    <Modal open onClose={onClose} title="Agregar cuenta" widthClassName="max-w-lg">
      <div className="space-y-4">
        <Field label="Usuario" hint="Letras, números, punto, guion y guion bajo. Es con lo que entra.">
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="nombre.apellido"
            className={fieldClass}
          />
        </Field>
        <Field label="Nombre completo" hint="Para saber de quién es la cuenta al leer la bitácora.">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={fieldClass} />
        </Field>
        <Alert kind="info">
          Se generará una contraseña temporal que verás una sola vez. Quien reciba la cuenta tendrá que cambiarla la
          primera vez que entre.
        </Alert>
        <div className="flex justify-end gap-2 pt-1">
          <PortalButton tone="ghost" onClick={onClose}>
            Cancelar
          </PortalButton>
          <PortalButton
            tone="accent"
            icon="plus"
            loading={busy}
            disabled={username.trim().length < 3 || nombre.trim().length === 0}
            onClick={() => onCrear(username.trim(), nombre.trim())}
          >
            Crear cuenta
          </PortalButton>
        </div>
      </div>
    </Modal>
  );
}

function PasswordTemporalModal({ datos, onClose }: { datos: { usuario: string; password: string }; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <Modal open onClose={onClose} title="Contraseña temporal" widthClassName="max-w-lg">
      <Alert kind="info">
        Esta contraseña no se puede volver a consultar: el servidor solo guarda su huella. Cópiala ahora y entrégala a
        su dueño por un medio seguro.
      </Alert>
      <div className="mt-5 rounded-xl border border-isel-line bg-isel-paper/60 px-4 py-4">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Usuario</p>
        <p className="mt-1 font-display text-[1.1rem] font-semibold text-isel-navy">{datos.usuario}</p>
        <p className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Contraseña</p>
        <p className="tabular mt-1 select-all break-all font-display text-[1.35rem] font-semibold text-isel-emerald2">
          {datos.password}
        </p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <PortalButton
          tone="ghost"
          icon={copiado ? "check" : "file"}
          onClick={() => {
            navigator.clipboard?.writeText(datos.password).then(
              () => setCopiado(true),
              () => setCopiado(false),
            );
          }}
        >
          {copiado ? "Copiada" : "Copiar"}
        </PortalButton>
        <PortalButton tone="primary" icon="check" onClick={onClose}>
          Ya la guardé
        </PortalButton>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- bitácora */

function BitacoraPanel() {
  const [eventos, setEventos] = useState<SecurityEvent[] | null>(null);
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setEventos(null);
    getBitacora(soloAlertas, 200)
      .then((e) => vivo && setEventos(e))
      .catch((e) => vivo && setError(e instanceof ApiError ? e.message : "No se pudo cargar la bitácora."));
    return () => {
      vivo = false;
    };
  }, [soloAlertas]);

  return (
    <PortalPanel
      step="02"
      accent="#B23A2B"
      title="Bitácora de seguridad"
      description="Quién entró, qué se borró y qué se exportó. Una ráfaga de accesos fallidos desde la misma dirección es alguien probando contraseñas."
      actions={
        <Segmented
          value={soloAlertas ? "alertas" : "todo"}
          onChange={(v) => setSoloAlertas(v === "alertas")}
          options={[
            { value: "todo" as const, label: "Todo" },
            { value: "alertas" as const, label: "Solo alertas" },
          ]}
        />
      }
    >
      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <div className="max-h-[28rem] overflow-auto rounded-xl border border-isel-line">
        {!eventos ? (
          <Loading label="Cargando la bitácora" />
        ) : eventos.length === 0 ? (
          <EmptyState icon="lock" title="Todavía no hay nada registrado" hint="Aquí van a ir apareciendo los accesos y los cambios." />
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-isel-line bg-isel-paper">
                <Th>Cuándo</Th>
                <Th>Qué pasó</Th>
                <Th>Quién</Th>
                <Th>Desde</Th>
                <Th>Detalle</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-isel-line/70">
              {eventos.map((e) => (
                <tr key={e.id} className={e.esAlerta ? "bg-isel-alert/[0.035]" : undefined}>
                  <Td className="tabular whitespace-nowrap text-isel-ink/55">
                    {new Date(e.ocurridoEn).toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short" })}
                  </Td>
                  <Td>
                    <span className={e.esAlerta ? "font-semibold text-isel-alert" : "text-isel-ink"}>
                      {ETIQUETAS[e.tipo] ?? e.tipo}
                    </span>
                  </Td>
                  <Td className="text-isel-ink/65">{e.actor}</Td>
                  <Td className="tabular text-isel-ink/45">{e.ip ?? "—"}</Td>
                  <Td className="text-isel-ink/55">{e.detalle || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PortalPanel>
  );
}

/* --------------------------------------------------------------- respaldos */

function RespaldosPanel() {
  const [respaldos, setRespaldos] = useState<BackupInfo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = () =>
    getRespaldos()
      .then(setRespaldos)
      .catch((e) => setError(e instanceof ApiError ? e.message : "No se pudieron listar los respaldos."));

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PortalPanel
      step="03"
      accent="#12855C"
      title="Respaldos"
      description="Se crea uno solo cada día y al arrancar el servidor. Se guardan los últimos 30 días."
      actions={
        <PortalButton
          tone="accent"
          icon="save"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await crearRespaldo();
              await cargar();
            } catch (e) {
              setError(e instanceof ApiError ? e.message : "No se pudo crear el respaldo.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Respaldar ahora
        </PortalButton>
      }
    >
      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <Alert kind="info">
        Un respaldo que vive en el mismo servidor no protege de que se dañe el disco. Descarga uno cada cierto tiempo y
        guárdalo en otro lugar.
      </Alert>

      <div className="mt-5 max-h-80 overflow-auto rounded-xl border border-isel-line">
        {!respaldos ? (
          <Loading label="Cargando respaldos" />
        ) : respaldos.length === 0 ? (
          <EmptyState icon="save" title="Todavía no hay respaldos" hint="Se crea uno solo poco después de arrancar el servidor." />
        ) : (
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-isel-line bg-isel-paper/60">
                <Th>Archivo</Th>
                <Th>Fecha</Th>
                <Th className="text-right">Tamaño</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-isel-line/70">
              {respaldos.map((b) => (
                <tr key={b.nombre}>
                  <Td className="tabular font-semibold text-isel-navy">{b.nombre}</Td>
                  <Td className="text-isel-ink/55">{new Date(b.creadoEn).toLocaleString("es-GT")}</Td>
                  <Td className="tabular text-right text-isel-ink/55">{Math.max(1, Math.round(b.bytes / 1024))} KB</Td>
                  <Td>
                    <div className="flex justify-end">
                      <PortalButton
                        tone="ghost"
                        size="sm"
                        icon="arrowDown"
                        onClick={() => descargarArchivo(`/api/admin/respaldos/${encodeURIComponent(b.nombre)}`, b.nombre)}
                      >
                        Descargar
                      </PortalButton>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-isel-ink/45">
        <Icon name="info" size={14} className="mt-0.5 shrink-0" />
        Los archivos van comprimidos (.db.gz). Para restaurar uno hay que descomprimirlo y poner el .db resultante en
        lugar del actual, con el servidor apagado — está explicado en el README.
      </p>
    </PortalPanel>
  );
}
