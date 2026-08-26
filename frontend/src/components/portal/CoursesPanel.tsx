import { useEffect, useState } from "react";
import type { Course } from "@/types/course";
import { createCourse, deleteCourse, getCourses, updateCourse } from "@/lib/coursesApi";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/hooks/useConfirm";

const inputClass =
  "rounded-lg border border-isel-line bg-white px-3 py-2 text-sm text-isel-ink transition-colors duration-200 focus:border-isel-navy focus:outline-none focus:ring-2 focus:ring-isel-navy/15";

/**
 * Admin-maintained course catalog (per carrera) — this is what feeds the
 * "Cursos por asignarse" picker and the "Cursos adicionales" search on the
 * student portal, so no student ever has to type a course name by hand.
 */
export function CoursesPanel({ carreras }: { carreras: string[] }) {
  const [filterCarrera, setFilterCarrera] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function load() {
    setLoading(true);
    try {
      setCourses(await getCourses(filterCarrera || undefined));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCarrera]);

  async function handleDelete(course: Course) {
    const ok = await confirm({
      title: "Eliminar curso",
      message: `¿Eliminar "${course.nombre}" del catálogo de ${course.carrera}?`,
      confirmLabel: "Sí, eliminar",
      danger: true,
    });
    if (!ok) return;
    await deleteCourse(course.id);
    load();
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-card">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-isel-navy">📚 Catálogo de cursos</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="rounded-full bg-isel-navy px-4 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:bg-isel-gold hover:text-isel-navy"
        >
          + Agregar curso
        </button>
      </div>
      <p className="mb-4 text-sm text-isel-ink/60">
        Estos son los cursos que los alumnos ven para elegir en su ficha — agrega aquí los oficiales de cada carrera.
      </p>

      <div className="mb-4">
        <select value={filterCarrera} onChange={(e) => setFilterCarrera(e.target.value)} className={`${inputClass} min-w-[16rem]`}>
          <option value="">Todas las carreras</option>
          {carreras.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-isel-ink/50">
              <th className="pb-2">Curso</th>
              <th className="pb-2">Carrera</th>
              <th className="pb-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-isel-line">
            {loading ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-isel-ink/50">
                  Cargando…
                </td>
              </tr>
            ) : courses.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-isel-ink/50">
                  Aún no hay cursos cargados{filterCarrera ? ` para ${filterCarrera}` : ""}. Agrega el primero arriba.
                </td>
              </tr>
            ) : (
              courses.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 pr-2">{c.nombre}</td>
                  <td className="py-2 pr-2">{c.carrera}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(c);
                          setModalOpen(true);
                        }}
                        className="text-xs font-semibold text-isel-navy hover:underline"
                      >
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDelete(c)} className="text-xs font-semibold text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CourseFormModal open={modalOpen} onClose={() => setModalOpen(false)} course={editing} carreras={carreras} onSaved={load} />
      {confirmDialog}
    </section>
  );
}

function CourseFormModal({
  open,
  onClose,
  course,
  carreras,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  course: Course | null;
  carreras: string[];
  onSaved: () => void;
}) {
  const [carrera, setCarrera] = useState("");
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCarrera(course?.carrera ?? carreras[0] ?? "");
      setNombre(course?.nombre ?? "");
      setError(null);
    }
  }, [open, course, carreras]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!carrera.trim() || !nombre.trim()) {
      setError("Carrera y nombre del curso son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (course) {
        await updateCourse(course.id, { carrera, nombre });
      } else {
        await createCourse({ carrera, nombre });
      }
      onSaved();
      onClose();
    } catch {
      setError("No se pudo guardar el curso.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={course ? "Editar curso" : "Agregar curso"} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-isel-ink/50">Carrera *</span>
          <select value={carrera} onChange={(e) => setCarrera(e.target.value)} className={`${inputClass} w-full`}>
            {carreras.length === 0 && <option value="">Sin carreras registradas todavía</option>}
            {carreras.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-isel-ink/50">Nombre del curso *</span>
          <input className={`${inputClass} w-full`} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-full border-2 border-isel-line px-5 py-2 text-sm font-semibold text-isel-ink/70 hover:border-isel-navy hover:text-isel-navy">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-isel-navy px-5 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:bg-isel-gold hover:text-isel-navy disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
