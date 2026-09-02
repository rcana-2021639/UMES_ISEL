import { useState } from "react";
import { cambiarPassword, marcarPasswordCambiada } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { Icon } from "@/components/portal/Icon";
import { Alert, Field, PortalButton, fieldClass } from "@/components/portal/kit";

/**
 * Se interpone delante del panel cuando la cuenta entró con una contraseña
 * temporal.
 *
 * Es una pantalla completa y no un aviso que se pueda cerrar: una contraseña
 * que otra persona tecleó al crear la cuenta —o que quedó escrita en el log de
 * arranque del servidor— no es un secreto, y dejar "cámbiala cuando puedas" es
 * la forma más segura de que nunca se cambie.
 */
export function CambiarPasswordGate({ onListo }: { onListo: () => void }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const coinciden = nueva.length > 0 && nueva === repetida;
  const suficiente = nueva.length >= 12;
  const puede = actual.length > 0 && coinciden && suficiente;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!puede || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await cambiarPassword(actual, nueva);
      marcarPasswordCambiada();
      onListo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-isel-paper px-6 py-14">
      <div className="w-full max-w-[26rem]">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-isel-line bg-white text-isel-gold2">
          <Icon name="lock" size={20} />
        </span>
        <h1 className="mt-5 font-display text-[1.9rem] font-semibold leading-[1.05] tracking-ultratight text-isel-navy">
          Cambia tu contraseña
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-isel-ink/55">
          Entraste con una contraseña temporal. Elige una tuya antes de seguir: la temporal la vio alguien más al
          entregártela.
        </p>

        <form onSubmit={guardar} className="mt-8 space-y-4">
          <Field label="Contraseña temporal">
            <input
              autoFocus
              type="password"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              className={fieldClass}
            />
          </Field>

          <Field label="Contraseña nueva" hint="Mínimo 12 caracteres. Una frase que recuerdes es mejor que ocho símbolos raros.">
            <input
              type="password"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              className={fieldClass}
            />
          </Field>

          <Field label="Repite la contraseña nueva">
            <input
              type="password"
              autoComplete="new-password"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              className={fieldClass}
            />
          </Field>

          {/* Las dos condiciones se enseñan mientras se escribe, no al enviar:
              descubrir "no coinciden" después de pulsar es lo que hace que la
              gente acabe usando la contraseña más corta que le acepten. */}
          <ul className="space-y-1.5 text-[12.5px]">
            <Requisito ok={suficiente}>Al menos 12 caracteres</Requisito>
            <Requisito ok={coinciden}>Las dos contraseñas coinciden</Requisito>
          </ul>

          {error && <Alert kind="error">{error}</Alert>}

          <PortalButton type="submit" tone="accent" icon="save" full loading={guardando} disabled={!puede} className="py-3.5">
            Guardar y entrar
          </PortalButton>
        </form>
      </div>
    </main>
  );
}

function Requisito({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-isel-emerald2" : "text-isel-ink/40"}`}>
      <Icon name={ok ? "check" : "minus"} size={13} />
      {children}
    </li>
  );
}
