import { useState } from "react";
import type { CourseAssignment } from "@/types/courseAssignment";

/**
 * Print-only rendition of the "Ficha de Asignación de Cursos" — laid out to
 * match the official paper form field-for-field (see
 * `FICHA DE ASIGNACIÓN DE CURSOS 2026.pdf/.xlsx` the user provided): same
 * header grid, the two side-by-side 1–5/6–10 "cursos asignados" blocks,
 * the "cursos adicionales" grid, checkbox-style observaciones, and the
 * firma/autorizado/contacto footer. Lives inside a `hidden print:block`
 * wrapper (see AdminPortalPage) so it never shows on screen — only when
 * `window.print()` is triggered.
 */
export function PrintableFichaBatch({ assignments }: { assignments: CourseAssignment[] }) {
  if (assignments.length === 0) {
    return <p className="p-8 text-center">No hay asignaciones para imprimir.</p>;
  }
  return (
    <div>
      {assignments.map((a, i) => (
        <PrintableFicha key={a.id} assignment={a} pageBreak={i < assignments.length - 1} />
      ))}
    </div>
  );
}

const cell = "border border-black px-1.5 py-1 align-middle";
const labelCell = `${cell} bg-gray-200 font-bold whitespace-nowrap`;
const headCell = `${cell} bg-gray-200 font-bold text-center`;

function PrintableFicha({ assignment: a, pageBreak }: { assignment: CourseAssignment; pageBreak?: boolean }) {
  const asignados = a.cursosAsignados.filter((r) => r.curso.trim());
  const adicionales = a.cursosAdicionales.filter((r) => r.cursoAdicional.trim());
  // The paper form has a fixed 10-slot (two 5-row columns) "cursos asignados" grid — a
  // trimestre's pensum realistically never has more than a handful of courses, but if it
  // somehow did, anything past slot 10 still gets its own extra row further down.
  const asignadosSlots = Array.from({ length: Math.max(10, asignados.length) }, (_, i) => asignados[i]);
  // Unlike the fixed 10-slot "asignados" grid (which mirrors the paper form's numbered layout), "adicionales" only
  // ever holds a handful of rows the student actually filled in — padding it to a fixed 5 wasted space and pushed
  // the ficha onto a second printed page even when there was just 1 extra course. Size it to content (min 1 row).
  const adicionalesSlots = Array.from({ length: Math.max(1, adicionales.length) }, (_, i) => adicionales[i]);

  return (
    <section
      className="mx-auto w-full max-w-[950px] p-6 text-[11px] text-black"
      style={pageBreak ? { breakAfter: "page" } : undefined}
    >
      {/* Letterhead */}
      <header className="mb-2 flex items-center justify-between gap-3">
        <FichaLogo src="/images/hero/logo-umes.png" alt="UMES" fallback="UMES" />
        <h1 className="text-center text-2xl font-black uppercase tracking-tight">Universidad Mesoamericana</h1>
        <FichaLogo src="/images/hero/logo-isel.png" alt="ISEL" fallback="ISEL" />
      </header>

      {/* Datos del alumno */}
      <table className="mb-3 w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${cell} bg-white`}></td>
            <th className={headCell}>Primer apellido</th>
            <th className={headCell}>Segundo apellido</th>
            <th className={headCell}>Primer Nombre</th>
            <th className={headCell}>Segundo nombre</th>
            <th className={labelCell}>FECHA:</th>
            <td className={cell}>{a.fecha}</td>
          </tr>
          <tr>
            <td className={labelCell}>NOMBRE COMPLETO DEL ALUMNO(A):</td>
            <td className={cell}>{a.primerApellido}</td>
            <td className={cell}>{a.segundoApellido}</td>
            <td className={cell}>{a.primerNombre}</td>
            <td className={cell}>{a.segundoNombre}</td>
            <th className={labelCell}>CARNÉ:</th>
            <td className={cell}>{a.carnet}</td>
          </tr>
          <tr>
            <td className={labelCell} colSpan={5}>
              CARRERA: <span className="font-normal">{a.carrera}</span>
            </td>
            <th className={labelCell}>SEM/TRIM</th>
            <td className={cell}>{a.trimestre}</td>
          </tr>
        </tbody>
      </table>

      <h2 className="mb-2 text-center text-sm font-bold underline">Asignación de cursos</h2>

      <p className="mb-1 text-[10px] font-bold uppercase">
        Anote el nombre correcto del curso o cursos que tiene actualmente asignados
      </p>
      <table className="mb-3 w-full border-collapse">
        <thead>
          <tr>
            <th className={headCell}>No.</th>
            <th className={headCell}>Curso asignado</th>
            <th className={headCell}>Sem/Tri</th>
            <th className={headCell}>Sección</th>
            <th className={headCell}>No.</th>
            <th className={headCell}>Curso asignado</th>
            <th className={headCell}>Sem/Tri</th>
            <th className={headCell}>Sección</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, i) => {
            const left = asignadosSlots[i];
            const right = asignadosSlots[i + 5];
            return (
              <tr key={i}>
                <td className={`${cell} text-center`}>{i + 1}</td>
                <td className={cell}>{left?.curso ?? ""}</td>
                <td className={`${cell} text-center`}>{left?.semTri ?? ""}</td>
                <td className={`${cell} text-center`}>{left?.seccion ?? ""}</td>
                <td className={`${cell} text-center`}>{i + 6}</td>
                <td className={cell}>{right?.curso ?? ""}</td>
                <td className={`${cell} text-center`}>{right?.semTri ?? ""}</td>
                <td className={`${cell} text-center`}>{right?.seccion ?? ""}</td>
              </tr>
            );
          })}
          {/* Extremely unlikely overflow past the paper form's 10 fixed slots — still shown, never dropped. */}
          {asignadosSlots.slice(10).map((r, i) => (
            <tr key={10 + i}>
              <td className={`${cell} text-center`}>{11 + i}</td>
              <td className={cell} colSpan={3}>
                {r?.curso ?? ""}
              </td>
              <td className={`${cell} text-center`}>{11 + i}</td>
              <td className={cell} colSpan={3}>
                {r?.semTri} {r?.seccion}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mb-1 text-[10px] font-bold uppercase">
        Anote el nombre correcto del curso o cursos que solicita agregarse y/o cambiarse de sección
      </p>
      <table className="mb-3 w-full border-collapse">
        <thead>
          <tr>
            <th className={headCell}>No.</th>
            <th className={headCell}>Curso adicional</th>
            <th className={headCell}>Carrera</th>
            <th className={headCell}>Sem/Tri</th>
            <th className={headCell}>Sección</th>
            <th className={headCell}>Jornada</th>
          </tr>
        </thead>
        <tbody>
          {adicionalesSlots.map((r, i) => (
            <tr key={i}>
              <td className={`${cell} text-center`}>{i + 1}</td>
              <td className={cell}>{r?.cursoAdicional ?? ""}</td>
              <td className={cell}>{r?.carrera ?? ""}</td>
              <td className={`${cell} text-center`}>{r?.semTri ?? ""}</td>
              <td className={`${cell} text-center`}>{r?.seccion ?? ""}</td>
              <td className={`${cell} text-center`}>{r?.jornada ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mb-4">
        <p className="italic font-bold">Observaciones:</p>
        <ObservacionRow checked={a.tienePendientesTrimestres} label="tengo trimestres o semestres completos anteriores pendientes de cursar." />
        <ObservacionRow checked={a.tienePendientesMaterias} label="tengo materias de trimestres o semestres anteriores pendientes de cursar." />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-10">
        <div>
          <div className="flex h-14 items-end justify-center">
            {a.firmaBase64 && <img src={a.firmaBase64} alt="Firma" className="h-14 object-contain" />}
          </div>
          <p className="border-t border-black pt-0.5 text-center text-[10px] font-semibold">FIRMA DEL ALUMNO(A)</p>
        </div>
        <div>
          <div className="flex h-14 items-end justify-center text-sm">{a.autorizadoPorCodigo ?? ""}</div>
          <p className="border-t border-black pt-0.5 text-center text-[10px] font-semibold">AUTORIZADO POR/ CÓDIGO</p>
        </div>
      </div>

      <table className="mb-3 w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${cell} w-28 bg-gray-200 font-bold`}>Correo electrónico:</td>
            <td className={cell} colSpan={3}>
              {a.correoContacto ?? ""}
            </td>
            <td className={`${cell} w-28 bg-gray-200 font-bold`}>Teléfono para contacto:</td>
            <td className={cell}>{a.telefonoContacto ?? ""}</td>
          </tr>
        </tbody>
      </table>

      <p className="text-[10px] font-bold">NOTA:</p>
      <p className="text-[9px] leading-snug text-black/80">
        El pensum de las carreras señala el número de cursos de cada ciclo lectivo. En Pregrado, a ese número, solo
        puede agregársele un máximo de dos cursos de ciclos lectivos precedentes, autorizados por el Decano de la
        Facultad, Director de Departamento o Coordinador. (Reglamento Académico, numeral 3.2, literal a)
      </p>

      <div className="mt-6 flex items-end justify-between text-[9px]">
        <p>Este formulario debe estar adjunto a la ficha de inscripción del trimestre correspondiente.</p>
        <p>Original expediente</p>
      </div>
    </section>
  );
}

function ObservacionRow({ checked, label }: { checked: boolean; label: string }) {
  return (
    <p className="flex items-center gap-1">
      <span>{!checked ? "☑" : "☐"} No</span>
      <span>{checked ? "☑" : "☐"} SI</span>
      <span className="italic">{label}</span>
    </p>
  );
}

/** Falls back to a bold text badge if the real logo file (see README per image folder) isn't there yet — never a broken-image icon on a printed document. */
function FichaLogo({ src, alt, fallback }: { src: string; alt: string; fallback: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <span className="text-lg font-black tracking-wide">{fallback}</span>;
  }
  return <img src={src} alt={alt} className="h-14 w-auto object-contain" onError={() => setBroken(true)} />;
}
