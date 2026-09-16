import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Alert, PortalButton } from "@/components/portal/kit";
import type { CourseAssignment } from "@/types/courseAssignment";
import type { Student } from "@/types/student";

/**
 * "Solicitar link de pago" — el correo ya escrito, con los datos del alumno puestos.
 *
 * Lo que sustituye: copiar a mano el nombre, el carné, la carrera, el celular y la forma de pago de
 * la fila de la tabla a un correo en blanco, una vez por alumno. Cinco datos, cuarenta veces al día,
 * y basta equivocarse en un dígito del carné para que el link de pago salga a nombre de otra persona.
 *
 * El botón abre el cliente de correo del sistema (Outlook, si es el predeterminado) con el
 * destinatario, el asunto y el cuerpo ya rellenos. Va por `mailto:` y no por la API de Outlook a
 * propósito: no hay que conectar ninguna cuenta, funciona igual desde cualquier computadora del
 * instituto, y el mensaje se abre como borrador para revisarlo antes de enviar — nunca se manda solo.
 *
 * El `mailto:` solo admite texto, así que la firma con el logo no viaja aquí: la pone Outlook por su
 * cuenta si está configurada como firma predeterminada, que es donde le corresponde vivir.
 */
export function CorreoPagoModal({
  assignment,
  student,
  onClose,
}: {
  assignment: CourseAssignment;
  student: Student | null;
  onClose: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  // Se prefiere lo que el alumno escribió en SU ficha sobre lo que está en el padrón: la ficha es de
  // este trimestre y el padrón puede llevar años sin tocarse.
  const destinatario =
    assignment.correoContacto?.trim() || student?.correoInstitucional?.trim() || student?.correoPersonal?.trim() || "";
  const celular = assignment.telefonoContacto?.trim() || student?.celular?.trim() || "";
  const cuota = assignment.tipoPago === "Link" ? "Link de pago" : assignment.tipoPago === "Presencial" ? "Presencial" : "";

  const asunto = `Solicitud de link de pago - ${assignment.nombreCompleto} (${assignment.carnet})`;

  const cuerpo = useMemo(
    () =>
      [
        "Saludos, solicito su apoyo para la creación y envío de un link de pago para el/la siguiente estudiante:",
        "",
        `Nombre completo: ${assignment.nombreCompleto}`,
        `No. Carné: ${assignment.carnet}`,
        `Carrera: ${assignment.carrera}`,
        `Cel: ${celular || "-"}`,
        `Desea pagar la cuota: ${cuota || "-"}`,
        "",
        "Quedo atento a cualquier otra información que se requiera y agradezco el apoyo.",
        "",
        "Excelente jornada",
      ].join("\n"),
    [assignment, celular, cuota],
  );

  function abrirEnOutlook() {
    const url = `mailto:${encodeURIComponent(destinatario)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.location.href = url;
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(cuerpo);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Solicitar link de pago" widthClassName="max-w-lg">
      <div className="space-y-4">
        <dl className="divide-y divide-isel-line overflow-hidden rounded-xl border border-isel-line">
          <CampoCorreo label="Para" valor={destinatario} faltaTexto="Este alumno no tiene correo registrado" />
          <CampoCorreo label="Asunto" valor={asunto} />
        </dl>

        {!destinatario && (
          <Alert kind="error">
            Se abrirá el borrador igual, pero con el destinatario en blanco: tendrás que escribir el correo
            del alumno en Outlook.
          </Alert>
        )}

        {!cuota && (
          <Alert kind="info">
            Este alumno no indicó forma de pago en su ficha, así que esa línea va en blanco.
          </Alert>
        )}

        <div>
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Mensaje</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-isel-line bg-white px-4 py-3.5 font-sans text-[12.5px] leading-relaxed text-isel-ink/80">
            {cuerpo}
          </pre>
        </div>

        <p className="text-[12px] leading-relaxed text-isel-ink/45">
          Se abre como borrador en tu programa de correo: nada se envía hasta que le des a Enviar allí. La
          firma con el logo la agrega Outlook por su cuenta si la tienes puesta como firma predeterminada.
        </p>

        <div className="flex flex-wrap justify-end gap-3 border-t border-isel-line pt-4">
          <PortalButton tone="ghost" icon={copiado ? "check" : "file"} onClick={() => void copiar()}>
            {copiado ? "Copiado" : "Copiar mensaje"}
          </PortalButton>
          <PortalButton tone="primary" icon="mail" onClick={abrirEnOutlook}>
            Abrir en Outlook
          </PortalButton>
        </div>
      </div>
    </Modal>
  );
}

function CampoCorreo({ label, valor, faltaTexto }: { label: string; valor: string; faltaTexto?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 bg-white px-4 py-2.5">
      <dt className="shrink-0 pt-0.5 text-[12.5px] text-isel-ink/55">{label}</dt>
      <dd className="min-w-0 break-words text-right text-[13px] font-semibold text-isel-navy">
        {valor || <span className="font-normal text-isel-alert">{faltaTexto}</span>}
      </dd>
    </div>
  );
}
