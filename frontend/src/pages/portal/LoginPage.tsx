import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { login } from "@/lib/auth";
import { useTilt } from "@/hooks/useTilt";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

export function LoginPage() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { rotateX, rotateY, onMouseMove, onMouseLeave } = useTilt(4);

  useEffect(() => {
    document.title = "Portal ISEL | Iniciar sesión";
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const session = await login(value.trim());
      const programa = searchParams.get("programa");
      if (session.role === "admin") {
        navigate("/portal/admin");
      } else {
        navigate(`/portal/estudiante${programa ? `?programa=${programa}` : ""}`);
      }
    } catch {
      setError("No encontramos ese carné. Verifica el número e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-isel-navy px-6 py-16">
      <RevealOnScroll className="w-full max-w-md" style={{ perspective: 1200 }}>
        <motion.div
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          style={{ rotateX, rotateY, transformPerspective: 1100 }}
          className="rounded-3xl bg-isel-paper p-8 shadow-card-hover sm:p-10"
        >
          <Link to="/" className="text-xs font-semibold uppercase tracking-wide text-isel-gold2">
            ISEL · Universidad Mesoamericana
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-isel-navy sm:text-3xl">Portal del estudiante</h1>
          <p className="mt-2 text-sm text-isel-ink/60">
            Ingresa tu número de carné para ver y completar tu ficha de asignación de cursos.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-isel-ink/50">Carné</span>
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ej. 202630503"
                className="w-full rounded-xl border-2 border-isel-line bg-white px-4 py-3 text-base text-isel-ink transition-colors duration-200 focus:border-isel-navy focus:outline-none focus:ring-2 focus:ring-isel-navy/15"
              />
            </label>

            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="w-full rounded-full bg-isel-navy px-6 py-3 text-sm font-semibold text-white transition-colors duration-300 ease-snap hover:bg-isel-gold hover:text-isel-navy disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Verificando…" : "Ingresar"}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-xs text-isel-ink/40">
            <Link to="/" className="underline-offset-2 hover:underline">
              ← Volver al sitio de ISEL
            </Link>
          </p>
        </motion.div>
      </RevealOnScroll>
    </main>
  );
}
