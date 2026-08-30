import { useEffect, useMemo, useState } from "react";
import type { Course } from "@/types/course";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "./Icon";
import { EmptyState, PortalButton, fieldClass } from "./kit";

/**
 * Selector de curso adicional.
 *
 * Antes esto era un desplegable de autocompletar con TODO el catálogo dentro:
 * Inglés y las seis maestrías, cada una con sus trimestres, en una sola lista
 * de cientos de líneas. Para encontrar un curso había que acordarse del nombre
 * exacto o bajar a ciegas.
 *
 * Ahora es lo que siempre debió ser: primero eliges de dónde —Inglés o una
 * maestría—, luego el trimestre, y solo entonces ves sus cursos, que son lo
 * único que se puede pulsar. El buscador sigue ahí para quien sí sabe el
 * nombre, y entonces enseña resultados planos diciendo de qué maestría y
 * trimestre viene cada uno, para que nadie elija el curso de otra carrera por
 * error.
 */

const INGLES = "Inglés";

interface CoursePickerModalProps {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  /** Curso ya elegido, para abrir el selector donde está y marcarlo. */
  value: number | null;
  onSelect: (courseId: number) => void;
}

function normalize(s: string): string {
  return Array.from(s.normalize("NFD"))
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    })
    .join("")
    .toLowerCase();
}

export function CoursePickerModal({ open, onClose, courses, value, onSelect }: CoursePickerModalProps) {
  const [group, setGroup] = useState<string | null>(null);
  const [trimestre, setTrimestre] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  /** Inglés primero — es transversal a todas las maestrías, no una más. */
  const groups = useMemo(() => {
    const all = Array.from(new Set(courses.map((c) => c.carrera)));
    const rest = all.filter((c) => c !== INGLES).sort((a, b) => a.localeCompare(b));
    return all.includes(INGLES) ? [INGLES, ...rest] : rest;
  }, [courses]);

  const current = group ?? groups[0] ?? null;

  const trimestresOf = useMemo(
    () =>
      Array.from(new Set(courses.filter((c) => c.carrera === current).map((c) => c.trimestre))).sort((a, b) => a - b),
    [courses, current],
  );

  // Al abrir, aterriza donde está el curso ya elegido; si no hay, en el primer grupo.
  useEffect(() => {
    if (!open) return;
    const chosen = value !== null ? courses.find((c) => c.id === value) : undefined;
    setGroup(chosen?.carrera ?? groups[0] ?? null);
    setTrimestre(chosen?.trimestre ?? null);
    setQuery("");
  }, [open, value, courses, groups]);

  /**
   * Trimestre efectivo, resuelto DURANTE el render y no en un efecto: si el
   * elegido no existe dentro del grupo actual, manda el primero del grupo.
   *
   * Hacerlo con un efecto dejaba un render intermedio con el trimestre en
   * nulo, y en ese render la lista de cursos salía vacía —"Sin cursos en este
   * trimestre"— hasta que el efecto corregía el estado. Resolviéndolo aquí, ese
   * render intermedio no existe.
   */
  const effTrimestre = trimestre !== null && trimestresOf.includes(trimestre) ? trimestre : (trimestresOf[0] ?? null);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return null;
    return courses.filter((c) => normalize(c.nombre).includes(q) || normalize(c.carrera).includes(q)).slice(0, 60);
  }, [courses, query]);

  const visible = useMemo(
    () => courses.filter((c) => c.carrera === current && c.trimestre === effTrimestre),
    [courses, current, effTrimestre],
  );

  function choose(id: number) {
    onSelect(id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Elegir curso adicional" widthClassName="max-w-3xl">
      <div className="space-y-5">
        <div className="relative">
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-isel-ink/30"
          />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca el curso por su nombre, o navega por maestría abajo…"
            className={`${fieldClass} pl-10 pr-9`}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-isel-ink/35 transition-colors duration-200 hover:bg-isel-navy/[0.07] hover:text-isel-navy"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        {results ? (
          /* ------------------------------------------------ modo búsqueda */
          <div className="max-h-[24rem] overflow-y-auto rounded-xl border border-isel-line bg-white">
            {results.length === 0 ? (
              <EmptyState
                icon="search"
                title={`Ningún curso se llama así`}
                hint="Prueba con una palabra suelta del nombre, o cierra la búsqueda y navega por maestría."
              />
            ) : (
              <ul className="divide-y divide-isel-line/70">
                {results.map((c) => (
                  <li key={c.id}>
                    <CourseRow
                      course={c}
                      selected={c.id === value}
                      onClick={() => choose(c.id)}
                      caption={c.carrera === INGLES ? INGLES : `${c.carrera} · Trimestre ${c.trimestre}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          /* -------------------------------------------- modo dos columnas */
          <div className="grid gap-4 sm:grid-cols-[15rem_minmax(0,1fr)]">
            {/* Origen. */}
            <div className="max-h-[24rem] overflow-y-auto rounded-xl border border-isel-line bg-white p-1.5">
              {groups.map((g) => {
                const on = g === current;
                const ingles = g === INGLES;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroup(g)}
                    className={`relative mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] leading-snug transition-colors duration-300 ease-crisp last:mb-0 ${
                      on ? "bg-isel-navy text-white" : "text-isel-ink/75 hover:bg-isel-paper"
                    }`}
                  >
                    <Icon
                      name={ingles ? "sparkle" : "layers"}
                      size={14}
                      className={on ? "text-isel-gold" : "text-isel-ink/30"}
                    />
                    <span className="flex-1">{g}</span>
                  </button>
                );
              })}
            </div>

            {/* Trimestre + cursos. */}
            <div className="flex max-h-[24rem] flex-col overflow-hidden rounded-xl border border-isel-line bg-white">
              {trimestresOf.length > 1 && (
                <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-b border-isel-line bg-isel-paper/50 px-3 py-2.5">
                  {trimestresOf.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTrimestre(t)}
                      className={`whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors duration-300 ease-crisp ${
                        t === effTrimestre
                          ? "border-transparent bg-isel-gold text-isel-deep"
                          : "border-isel-line bg-white text-isel-ink/50 hover:text-isel-navy"
                      }`}
                    >
                      Trimestre {t}
                    </button>
                  ))}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto">
                {visible.length === 0 ? (
                  <EmptyState icon="layers" title="Sin cursos en este trimestre" />
                ) : (
                  <ul className="divide-y divide-isel-line/70">
                    {visible.map((c) => (
                      <li key={c.id}>
                        <CourseRow course={c} selected={c.id === value} onClick={() => choose(c.id)} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-isel-line pt-4">
          <p className="text-[12px] text-isel-ink/45">Pulsa un curso para elegirlo.</p>
          <PortalButton tone="ghost" onClick={onClose}>
            Cancelar
          </PortalButton>
        </div>
      </div>
    </Modal>
  );
}

/** Fila de curso: lo único pulsable del selector. */
function CourseRow({
  course,
  selected,
  onClick,
  caption,
}: {
  course: Course;
  selected: boolean;
  onClick: () => void;
  caption?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group/c relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-300 ease-crisp ${
        selected ? "bg-isel-emerald/[0.08]" : "hover:bg-isel-paper/70"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] origin-top bg-isel-emerald transition-transform duration-500 ease-snap ${
          selected ? "scale-y-100" : "scale-y-0 group-hover/c:scale-y-100"
        }`}
      />
      <span
        aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-300 ease-crisp ${
          selected
            ? "border-isel-emerald bg-isel-emerald text-white"
            : "border-isel-line text-transparent group-hover/c:border-isel-emerald/50"
        }`}
      >
        <Icon name="check" size={13} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[13.5px] leading-snug ${selected ? "font-semibold text-isel-navy" : "text-isel-ink"}`}>
          {course.nombre}
        </span>
        {caption && <span className="mt-0.5 block text-[11.5px] text-isel-ink/45">{caption}</span>}
      </span>
    </button>
  );
}
