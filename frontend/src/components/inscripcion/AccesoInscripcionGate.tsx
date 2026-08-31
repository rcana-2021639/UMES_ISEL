import { useState } from "react";
import { Link } from "react-router-dom";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Icon } from "@/components/portal/Icon";
import { Alert, PortalButton, Segmented, fieldClass } from "@/components/portal/kit";
import { accesoInscripcion } from "@/lib/inscripcionesApi";
import { ApiError } from "@/lib/http";
import type { Applicant } from "@/types/inscripcion";

/**
 * Puerta de entrada a "Inscripción" — sin contraseña, igual que el ingreso por carné del portal de
 * Asignación, pero aquí la clave es el DPI (o el pasaporte, si el aspirante es extranjero y no tiene
 * DPI guatemalteco), porque todavía no existe ningún carné. La primera vez crea el aspirante; si ya
 * existía, reanuda exactamente donde lo dejó.
 */
export function AccesoInscripcionGate({ onEnter }: { onEnter: (applicant: Applicant) => void }) {
  const [modo, setModo] = useState<"dpi" | "pasaporte">("dpi");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const applicant = await accesoInscripcion(modo === "dpi" ? { dpi: value.trim() } : { pasaporte: value.trim() });
      onEnter(applicant);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo iniciar la inscripción. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-isel-paper lg:grid lg:min-h-screen lg:grid-cols-[1.08fr_1fr]">
      <section className="grain relative flex flex-col overflow-hidden bg-isel-deep px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-4 h-[34rem] w-[34rem] animate-drift rounded-full bg-isel-gold blur-[130px] opacity-25"
        />
        <div className="relative mx-auto flex w-full max-w-[31rem] flex-1 flex-col justify-between gap-12">
          <Link to="/" className="group inline-flex w-fit items-center gap-3">
            <span className="h-11 w-11 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15 transition-transform duration-500 ease-snap group-hover:scale-105">
              <ImageSlot src="/images/hero/logo-isel.avif" alt="Logo ISEL" label="ISEL" tone="dark" glyph="I" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[15px] font-bold tracking-[0.22em] text-white">ISEL</span>
              <span className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-white/45">Universidad Mesoamericana</span>
            </span>
          </Link>

          <div>
            <span className="eyebrow text-isel-gold">Inscripción de nuevo ingreso</span>
            <h1 className="mt-6 max-w-[14ch] text-balance font-display text-[clamp(2rem,4.2vw,3rem)] font-semibold leading-[0.98] tracking-ultratight text-white">
              Empecemos tu expediente
            </h1>
            <p className="mt-6 max-w-[42ch] text-[14px] leading-relaxed text-white/60">
              Vas a completar 4 partes: preinscripción, asignación de cursos, carta de compromiso y tus
              documentos. Puedes cerrar la página y volver más tarde — con tu mismo DPI retomas donde
              te quedaste.
            </p>
          </div>

          <p className="flex items-center gap-2.5 text-[12.5px] text-white/35">
            <Icon name="lock" size={14} />
            No necesitas contraseña: tu DPI (o pasaporte) es tu llave para regresar.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-14 sm:px-10 lg:px-14">
        <div className="w-full max-w-[26rem]">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-isel-gold2">Identifícate</p>
          <h2 className="mt-3 font-display text-[1.7rem] font-semibold leading-[1.05] tracking-ultratight text-isel-navy">
            ¿Con qué documento te identificas?
          </h2>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="mb-5">
              <Segmented
                value={modo}
                onChange={(m) => {
                  setModo(m);
                  setValue("");
                  setError(null);
                }}
                options={[
                  { value: "dpi" as const, label: "DPI" },
                  { value: "pasaporte" as const, label: "Pasaporte (extranjero)" },
                ]}
              />
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">
                {modo === "dpi" ? "Número de DPI" : "Número de pasaporte"}
              </span>
              <input
                autoFocus
                inputMode={modo === "dpi" ? "numeric" : "text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={modo === "dpi" ? "2900 12345 0101" : "AA1234567"}
                className={fieldClass}
              />
            </label>

            {error && (
              <div className="mt-5">
                <Alert kind="error">{error}</Alert>
              </div>
            )}

            <PortalButton
              type="submit"
              tone="accent"
              icon="arrowRight"
              iconRight
              full
              loading={loading}
              disabled={!value.trim()}
              className="mt-7 py-3.5 text-[14px]"
            >
              Empezar / continuar
            </PortalButton>
          </form>

          <div className="mt-8">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 text-[13px] font-semibold text-isel-ink/50 transition-colors duration-300 ease-crisp hover:text-isel-navy"
            >
              <Icon name="arrowLeft" size={15} className="transition-transform duration-500 ease-snap group-hover:-translate-x-1" />
              Volver al sitio de ISEL
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
