import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/portal/Icon";
import { PortalButton } from "@/components/portal/kit";
import { ApiError } from "@/lib/http";

export interface LoginErrorInfo {
  titulo: string;
  mensaje: string;
  /** Sugerencias concretas, en el orden en que conviene revisarlas. Vacío si no aplica (p. ej. sin conexión). */
  sugerencias?: string[];
}

/**
 * Traduce lo que devolvió el servidor (o la falta de respuesta) a algo que explica qué revisar.
 *
 * Antes un intento fallido solo limpiaba el campo de contraseña y dejaba un texto pequeño al pie
 * del formulario — quien no lo veía (el foco seguía en el teclado, el mensaje quedaba fuera de la
 * pantalla en el teléfono) sentía que "la página se reinició sola" y no sabía qué corregir.
 *
 * El servidor sigue sin decir SI existía el carné o SI el correo era el equivocado — distinguirlo
 * serviría para averiguar qué carnés están dados de alta (ver AuthController) — pero eso no impide
 * dar las dos causas más comunes como sugerencias, sin confirmar cuál de las dos fue.
 */
export function describirErrorLogin(err: unknown, modo: "alumno" | "admin"): LoginErrorInfo {
  if (!(err instanceof ApiError)) {
    return {
      titulo: "No se pudo conectar",
      mensaje: "No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.",
    };
  }

  if (err.status === 429) {
    return {
      titulo: "Demasiados intentos",
      mensaje: "Se detectaron varios intentos seguidos y el acceso se pausó por un momento, para proteger las cuentas.",
      sugerencias: ["Espera unos minutos antes de volver a intentarlo."],
    };
  }

  if (err.status === 400) {
    return {
      titulo: "Faltan datos",
      mensaje: err.message || "Completa todos los campos antes de continuar.",
    };
  }

  if (modo === "alumno") {
    return {
      titulo: "No pudimos verificarte",
      mensaje: "El carné o el correo no coinciden con ningún registro.",
      sugerencias: [
        "Revisa que el número de carné esté completo y sin espacios.",
        "Usa tu correo institucional (@umes.edu.gt); si no lo recuerdas completo, basta con lo que va antes de la arroba.",
        "Si tu correo institucional nunca te funciona, puede que en el padrón solo tengas registrado el personal — escríbele a Coordinación para confirmarlo.",
      ],
    };
  }

  return {
    titulo: "No pudimos verificarte",
    mensaje: "El usuario o la contraseña no coinciden.",
    sugerencias: ["Revisa mayúsculas y espacios.", "Si olvidaste tu contraseña, pide a otra cuenta administradora que te la reinicie."],
  };
}

export function LoginErrorModal({ info, onClose }: { info: LoginErrorInfo | null; onClose: () => void }) {
  return (
    <Modal open={info !== null} onClose={onClose} title={info?.titulo ?? "No se pudo entrar"} widthClassName="max-w-sm">
      {info && (
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-isel-alert/10 text-isel-alert">
              <Icon name="alert" size={22} />
            </span>
            <p className="pt-0.5 text-[13.5px] leading-relaxed text-isel-ink">{info.mensaje}</p>
          </div>

          {info.sugerencias && info.sugerencias.length > 0 && (
            <ul className="space-y-2 rounded-xl border border-isel-line bg-isel-paper/60 p-4">
              {info.sugerencias.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-isel-ink/70">
                  <Icon name="chevronRight" size={13} className="mt-0.5 shrink-0 text-isel-gold2" />
                  {s}
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end border-t border-isel-line pt-4">
            <PortalButton tone="primary" onClick={onClose}>
              Entendido
            </PortalButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
