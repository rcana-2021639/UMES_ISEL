using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UmesIsel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AsignarCohortesYUnificarPensum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ---- Datos -------------------------------------------------------------------------
            // 1. Una cohorte por cada año de carné que ya existe en el padrón (los cuatro
            //    primeros dígitos del carné son el año de ingreso), y cada alumno a la suya.
            migrationBuilder.Sql(@"
INSERT INTO Cohortes (Anio, Periodo, Nombre, FechaInicio, AbiertaInscripcion, CreatedAt, UpdatedAt)
SELECT DISTINCT CAST(substr(Carnet, 1, 4) AS INTEGER), 1, 'Cohorte ' || substr(Carnet, 1, 4), NULL, 0, datetime('now'), datetime('now')
FROM Students WHERE substr(Carnet, 1, 4) GLOB '20[0-9][0-9]';");

            // 2. La maestría en Auditoría estaba registrada tres veces —sin sufijo, "(CARNÉ 2025)"
            //    y "(CARNÉ 2026)"— solo porque su pénsum cambió entre un año y otro. Con cohortes
            //    vuelve a ser UNA carrera con dos versiones del pénsum: la de 8 trimestres vigente
            //    desde la cohorte 2025 y la de 6 trimestres desde la 2026. Cada paso comprueba que
            //    las carreras existan, así que en una base que no las tenga no hace nada.
            const string baseN = "Maestría en Auditoria de desempeño";
            const string v25 = "Maestría en Auditoria de desempeño (CARNÉ 2025)";
            const string v26 = "Maestría en Auditoria de desempeño (CARNÉ 2026)";
            var hayQueUnir = $"EXISTS (SELECT 1 FROM Carreras WHERE Nombre = '{baseN}') AND EXISTS (SELECT 1 FROM Carreras WHERE Nombre = '{v25}')";

            foreach (var anio in new[] { 2025, 2026 })
            {
                migrationBuilder.Sql($@"
INSERT OR IGNORE INTO Cohortes (Anio, Periodo, Nombre, FechaInicio, AbiertaInscripcion, CreatedAt, UpdatedAt)
SELECT {anio}, 1, 'Cohorte {anio}', NULL, 0, datetime('now'), datetime('now') WHERE {hayQueUnir};");
            }

            // La variante "(CARNÉ 2026)" es idéntica curso por curso a la que no lleva sufijo.
            migrationBuilder.Sql($"DELETE FROM Courses WHERE Carrera = '{v26}' AND {hayQueUnir};");
            migrationBuilder.Sql($@"
UPDATE Courses SET CohorteId = (SELECT Id FROM Cohortes WHERE Anio = 2026 AND Periodo = 1)
WHERE Carrera = '{baseN}' AND CohorteId IS NULL AND {hayQueUnir};");
            migrationBuilder.Sql($@"
UPDATE Courses SET Carrera = '{baseN}', CohorteId = (SELECT Id FROM Cohortes WHERE Anio = 2025 AND Periodo = 1)
WHERE Carrera = '{v25}' AND {hayQueUnir};");

            foreach (var (tabla, columna) in new[]
                     {
                         ("Students", "Carrera"), ("CourseAssignments", "Carrera"), ("AdditionalCourseRows", "Carrera"),
                         ("Preinscripciones", "Carrera"), ("AsignacionesNuevoIngreso", "Carrera"),
                         ("AsignacionNuevoIngresoAdicionalRows", "Carrera"), ("CartasCompromiso", "Carrera"),
                     })
            {
                migrationBuilder.Sql($"UPDATE {tabla} SET {columna} = '{baseN}' WHERE {columna} IN ('{v25}', '{v26}') AND {hayQueUnir};");
            }

            migrationBuilder.Sql($"DELETE FROM Carreras WHERE Nombre = '{v26}' AND {hayQueUnir};");
            migrationBuilder.Sql($"DELETE FROM Carreras WHERE Nombre = '{v25}' AND EXISTS (SELECT 1 FROM Carreras WHERE Nombre = '{baseN}');");

            // 3. Alumnos a su cohorte (después del paso 2, que pudo crear la 2025/2026).
            migrationBuilder.Sql(@"
UPDATE Students SET CohorteId = (
    SELECT c.Id FROM Cohortes c WHERE c.Anio = CAST(substr(Students.Carnet, 1, 4) AS INTEGER) AND c.Periodo = 1)
WHERE substr(Carnet, 1, 4) GLOB '20[0-9][0-9]';");

            // 4. La cohorte más reciente queda abierta a inscripciones para que el formulario de
            //    nuevo ingreso siga funcionando; el admin abre y cierra las demás desde "Pénsum".
            migrationBuilder.Sql("UPDATE Cohortes SET AbiertaInscripcion = 1 WHERE Anio * 10 + Periodo = (SELECT MAX(Anio * 10 + Periodo) FROM Cohortes);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Paso de datos: no se deshace. Revertir el esquema (AddCohortes) basta para volver atrás.
        }
    }
}
