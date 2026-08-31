import { useEffect } from "react";

/**
 * Inscripción de nuevo ingreso — placeholder.
 *
 * Se completa en la fase D del trabajo en curso (wizard de 4 secciones:
 * preinscripción, asignación de cursos a mano, carta de compromiso y
 * documentos). Este archivo solo evita que la ruta pública `/inscripcion`
 * quede rota mientras se construye el resto.
 */
export function InscripcionPage() {
  useEffect(() => {
    document.title = "Inscripción | ISEL";
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-isel-paper px-6 text-center">
      <p className="text-isel-ink/50">Cargando inscripción…</p>
    </main>
  );
}
