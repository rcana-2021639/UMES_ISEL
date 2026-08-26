import type { CourseAssignment } from "@/types/courseAssignment";

/**
 * Print-only rendition of the "Ficha de Asignación de Cursos", laid out to
 * match the original paper form. Lives inside a `hidden print:block`
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

function PrintableFicha({ assignment: a, pageBreak }: { assignment: CourseAssignment; pageBreak?: boolean }) {
  const asignados = a.cursosAsignados.filter((r) => r.curso.trim());
  const adicionales = a.cursosAdicionales.filter((r) => r.cursoAdicional.trim());

  return (
    <section
      className="mx-auto w-full max-w-[900px] p-8 text-black"
      style={pageBreak ? { breakAfter: "page" } : undefined}
    >
      <header className="mb-6 flex items-center justify-between border-b-2 border-black pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide">Universidad Mesoamericana</p>
          <h1 className="text-lg font-bold uppercase">Ficha de Asignación de Cursos</h1>
        </div>
        <p className="text-xs">Trimestre {a.trimestre}</p>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
        <InfoBox label="Nombre completo del alumno(a)" value={a.nombreCompleto} span={3} />
        <InfoBox label="Carné" value={a.carnet} />
        <InfoBox label="Fecha" value={a.fecha} />
        <InfoBox label="Sem/Trim" value={String(a.trimestre)} />
        <InfoBox label="Carrera" value={a.carrera} span={3} />
      </div>

      <h2 className="mb-1 text-sm font-bold uppercase">Asignación de cursos</h2>
      <table className="mb-4 w-full border-collapse text-xs">
        <thead>
          <tr>
            {["No.", "Curso asignado", "Sem/Tri", "Sección"].map((h) => (
              <th key={h} className="border border-black px-2 py-1 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {asignados.length === 0 ? (
            <tr>
              <td className="border border-black px-2 py-1" colSpan={4}>
                —
              </td>
            </tr>
          ) : (
            asignados.map((r) => (
              <tr key={r.numero}>
                <td className="border border-black px-2 py-1">{r.numero}</td>
                <td className="border border-black px-2 py-1">{r.curso}</td>
                <td className="border border-black px-2 py-1">{r.semTri}</td>
                <td className="border border-black px-2 py-1">{r.seccion}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2 className="mb-1 text-sm font-bold uppercase">Cursos adicionales o cambio de sección</h2>
      <table className="mb-4 w-full border-collapse text-xs">
        <thead>
          <tr>
            {["No.", "Curso adicional", "Carrera", "Sem/Tri", "Sección", "Jornada"].map((h) => (
              <th key={h} className="border border-black px-2 py-1 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {adicionales.length === 0 ? (
            <tr>
              <td className="border border-black px-2 py-1" colSpan={6}>
                —
              </td>
            </tr>
          ) : (
            adicionales.map((r) => (
              <tr key={r.numero}>
                <td className="border border-black px-2 py-1">{r.numero}</td>
                <td className="border border-black px-2 py-1">{r.cursoAdicional}</td>
                <td className="border border-black px-2 py-1">{r.carrera}</td>
                <td className="border border-black px-2 py-1">{r.semTri}</td>
                <td className="border border-black px-2 py-1">{r.seccion}</td>
                <td className="border border-black px-2 py-1">{r.jornada}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mb-4 text-xs">
        <p>☐ Tengo trimestres o semestres completos anteriores pendientes de cursar: <strong>{a.tienePendientesTrimestres ? "Sí" : "No"}</strong></p>
        <p>☐ Tengo materias de trimestres o semestres anteriores pendientes de cursar: <strong>{a.tienePendientesMaterias ? "Sí" : "No"}</strong></p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="mb-1 text-xs font-bold uppercase">Firma del alumno(a)</p>
          <div className="flex h-20 items-end border-b border-black">
            {a.firmaBase64 && <img src={a.firmaBase64} alt="Firma" className="h-20 object-contain" />}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase">Autorizado por / código</p>
          <div className="flex h-20 items-end border-b border-black text-sm">{a.autorizadoPorCodigo ?? ""}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <InfoBox label="Correo electrónico" value={a.correoContacto ?? ""} />
        <InfoBox label="Teléfono para contacto" value={a.telefonoContacto ?? ""} />
      </div>

      <p className="mt-6 text-[10px] leading-snug text-black/70">
        NOTA: El pensum de las carreras señala el número de cursos de cada ciclo lectivo. En Pregrado, a ese número solo
        puede agregársele un máximo de dos cursos de ciclos lectivos precedentes, autorizados por el Decano de la
        Facultad, Director de Departamento o Coordinador. (Reglamento Académico, numeral 3.2, literal a). Este
        formulario debe estar adjunto a la ficha de inscripción del trimestre correspondiente.
      </p>
    </section>
  );
}

function InfoBox({ label, value, span = 1 }: { label: string; value: string; span?: number }) {
  return (
    <div className={span === 3 ? "col-span-3" : span === 2 ? "col-span-2" : undefined}>
      <p className="text-[10px] font-bold uppercase text-black/60">{label}</p>
      <p className="border-b border-black pb-0.5">{value || " "}</p>
    </div>
  );
}
