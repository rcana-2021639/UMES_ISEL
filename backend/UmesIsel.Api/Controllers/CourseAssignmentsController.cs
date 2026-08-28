using System.IO.Compression;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;
using UmesIsel.Api.Services;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// The "Ficha de Asignación de Cursos": students save their own (portal),
/// the admin panel lists/prints/filters them by date range.
/// </summary>
[ApiController]
[Route("api/course-assignments")]
public class CourseAssignmentsController : ControllerBase
{
    private readonly IselDbContext _db;
    private readonly FichaXlsxBuilder _fichaBuilder;
    private readonly FichaPdfBuilder _fichaPdfBuilder;

    public CourseAssignmentsController(IselDbContext db, FichaXlsxBuilder fichaBuilder, FichaPdfBuilder fichaPdfBuilder)
    {
        _db = db;
        _fichaBuilder = fichaBuilder;
        _fichaPdfBuilder = fichaPdfBuilder;
    }

    private static CourseAssignmentDto ToDto(CourseAssignment ca) => new(
        ca.Id,
        ca.StudentId,
        ca.Student?.Carnet ?? string.Empty,
        ca.Student?.NombreCompleto ?? string.Empty,
        ca.Student?.PrimerApellido ?? string.Empty,
        ca.Student?.SegundoApellido,
        ca.Student?.PrimerNombre ?? string.Empty,
        ca.Student?.SegundoNombre,
        ca.Fecha,
        ca.Trimestre,
        ca.Carrera,
        ca.Seccion,
        ca.CursosAsignados.OrderBy(r => r.Numero).Select(r => new AssignedCourseRowDto(r.Numero, r.Curso, r.SemTri, r.Seccion)).ToList(),
        ca.CursosAdicionales.OrderBy(r => r.Numero).Select(r => new AdditionalCourseRowDto(r.Numero, r.CursoAdicional, r.Carrera, r.SemTri, r.Seccion, r.Jornada)).ToList(),
        ca.TienePendientesTrimestres,
        ca.TienePendientesMaterias,
        ca.CorreoContacto,
        ca.TelefonoContacto,
        ca.TipoPago,
        ca.FirmaBase64,
        ca.FirmadoEn,
        ca.AutorizadoPorCodigo,
        ca.UpdatedAt
    );

    private IQueryable<CourseAssignment> WithIncludes() =>
        _db.CourseAssignments
            .Include(ca => ca.Student)
            .Include(ca => ca.CursosAsignados)
            .Include(ca => ca.CursosAdicionales);

    /// <summary>GET /api/course-assignments?from=2026-08-25&to=2026-08-25&tipoPago=Link — used by Hoy/Semana/Mes, the date picker, and the payment-method filter.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CourseAssignmentDto>>> GetAll(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? tipoPago)
    {
        var query = WithIncludes().AsNoTracking().AsQueryable();

        if (from.HasValue)
        {
            query = query.Where(ca => ca.Fecha >= from.Value);
        }
        if (to.HasValue)
        {
            query = query.Where(ca => ca.Fecha <= to.Value);
        }
        if (!string.IsNullOrWhiteSpace(tipoPago))
        {
            query = query.Where(ca => ca.TipoPago == tipoPago);
        }

        var results = await query.OrderByDescending(ca => ca.Fecha).ToListAsync();
        return Ok(results.Select(ToDto).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CourseAssignmentDto>> GetById(int id)
    {
        var ca = await WithIncludes().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return ca is null ? NotFound() : Ok(ToDto(ca));
    }

    /// <summary>GET /api/course-assignments/by-student/{carnet}?trimestre=3 — the student portal's own ficha (latest if trimestre omitted).</summary>
    [HttpGet("by-student/{carnet}")]
    public async Task<ActionResult<CourseAssignmentDto>> GetByStudent(string carnet, [FromQuery] int? trimestre)
    {
        var query = WithIncludes().AsNoTracking().Where(ca => ca.Student!.Carnet == carnet);
        if (trimestre.HasValue)
        {
            query = query.Where(ca => ca.Trimestre == trimestre.Value);
        }

        var ca = await query.OrderByDescending(x => x.Fecha).FirstOrDefaultAsync();
        return ca is null ? NotFound() : Ok(ToDto(ca));
    }

    /// <summary>
    /// POST /api/course-assignments — upsert by (carné, carrera, trimestre). The student
    /// portal's "Guardar asignación" and the admin's edit view both call this. Fecha is
    /// always stamped to the day it was actually (re)generated.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<CourseAssignmentDto>> Save(CourseAssignmentUpsertRequest request)
    {
        var student = await _db.Students.FirstOrDefaultAsync(s => s.Carnet == request.Carnet);
        if (student is null)
        {
            return NotFound("No existe un alumno con ese carné.");
        }

        var existing = await _db.CourseAssignments
            .Include(ca => ca.CursosAsignados)
            .Include(ca => ca.CursosAdicionales)
            .FirstOrDefaultAsync(ca => ca.StudentId == student.Id && ca.Carrera == request.Carrera && ca.Trimestre == request.Trimestre);

        var now = DateTime.UtcNow;
        CourseAssignment ca;

        if (existing is null)
        {
            ca = new CourseAssignment
            {
                StudentId = student.Id,
                Trimestre = request.Trimestre,
                Carrera = request.Carrera,
                CreatedAt = now,
            };
            _db.CourseAssignments.Add(ca);
        }
        else
        {
            ca = existing;
            _db.AssignedCourseRows.RemoveRange(ca.CursosAsignados);
            _db.AdditionalCourseRows.RemoveRange(ca.CursosAdicionales);
            ca.CursosAsignados.Clear();
            ca.CursosAdicionales.Clear();
        }

        // Every save re-generates the ficha, so Fecha always reflects the day it was (re)generated.
        ca.Fecha = DateOnly.FromDateTime(DateTime.Now);
        ca.Seccion = request.Seccion?.Trim();
        ca.TienePendientesTrimestres = request.TienePendientesTrimestres;
        ca.TienePendientesMaterias = request.TienePendientesMaterias;
        ca.CorreoContacto = request.CorreoContacto?.Trim();
        ca.TelefonoContacto = request.TelefonoContacto?.Trim();
        ca.TipoPago = request.TipoPago;
        ca.UpdatedAt = now;

        if (!string.IsNullOrWhiteSpace(request.FirmaBase64))
        {
            ca.FirmaBase64 = request.FirmaBase64;
            ca.FirmadoEn = now;
        }
        if (!string.IsNullOrWhiteSpace(request.AutorizadoPorCodigo))
        {
            ca.AutorizadoPorCodigo = request.AutorizadoPorCodigo;
        }

        foreach (var row in request.CursosAsignados.Where(r => !string.IsNullOrWhiteSpace(r.Curso)))
        {
            ca.CursosAsignados.Add(new AssignedCourseRow
            {
                Numero = row.Numero,
                Curso = row.Curso.Trim(),
                SemTri = row.SemTri,
                Seccion = row.Seccion,
            });
        }

        foreach (var row in request.CursosAdicionales.Where(r => !string.IsNullOrWhiteSpace(r.CursoAdicional)))
        {
            ca.CursosAdicionales.Add(new AdditionalCourseRow
            {
                Numero = row.Numero,
                CursoAdicional = row.CursoAdicional.Trim(),
                Carrera = row.Carrera,
                SemTri = row.SemTri,
                Seccion = row.Seccion,
                Jornada = row.Jornada,
            });
        }

        await _db.SaveChangesAsync();

        var saved = await WithIncludes().AsNoTracking().FirstAsync(x => x.Id == ca.Id);
        return Ok(ToDto(saved));
    }

    /// <summary>
    /// GET /api/course-assignments/{id}/ficha.xlsx — a filled copy of the official ficha template
    /// (Resources/FichaTemplate.xlsx), ready to open and print from Excel with the exact design.
    /// </summary>
    [HttpGet("{id:int}/ficha.xlsx")]
    public async Task<IActionResult> GetFichaXlsx(int id)
    {
        var ca = await WithIncludes().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (ca is null) return NotFound();

        var bytes = _fichaBuilder.Build(ToDto(ca));
        return File(bytes, XlsxContentType, FichaFileName(ca.Student));
    }

    /// <summary>
    /// GET /api/course-assignments/ficha-batch.zip?from=&amp;to=&amp;tipoPago= — same filters as GetAll,
    /// but returns one filled .xlsx per matching ficha inside a single .zip ("Imprimir todas").
    /// </summary>
    [HttpGet("ficha-batch.zip")]
    public async Task<IActionResult> GetFichaBatchZip(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? tipoPago)
    {
        var query = WithIncludes().AsNoTracking().AsQueryable();
        if (from.HasValue) query = query.Where(ca => ca.Fecha >= from.Value);
        if (to.HasValue) query = query.Where(ca => ca.Fecha <= to.Value);
        if (!string.IsNullOrWhiteSpace(tipoPago)) query = query.Where(ca => ca.TipoPago == tipoPago);

        var results = await query.OrderBy(ca => ca.Student!.PrimerApellido).ToListAsync();
        if (results.Count == 0) return NotFound("No hay fichas para ese rango/filtro.");

        using var zipStream = new MemoryStream();
        using (var zip = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            var usedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var ca in results)
            {
                var bytes = _fichaBuilder.Build(ToDto(ca));
                var name = FichaFileName(ca.Student);
                var dedupedName = name;
                var suffix = 2;
                while (!usedNames.Add(dedupedName))
                {
                    dedupedName = $"{Path.GetFileNameWithoutExtension(name)} ({suffix++}){Path.GetExtension(name)}";
                }
                var entry = zip.CreateEntry(dedupedName, CompressionLevel.Optimal);
                using var entryStream = entry.Open();
                entryStream.Write(bytes, 0, bytes.Length);
            }
        }

        return File(zipStream.ToArray(), "application/zip", "Fichas.zip");
    }

    private static string FichaFileName(Student? student, string extension) =>
        Path.ChangeExtension(FichaFileName(student), extension);

    /// <summary>
    /// GET /api/course-assignments/{id}/ficha.pdf — the same filled ficha as .xlsx, converted to PDF
    /// (via LibreOffice headless — see FichaPdfBuilder) so "Imprimir" opens something the browser can
    /// print directly, no need to open Excel first.
    /// </summary>
    [HttpGet("{id:int}/ficha.pdf")]
    public async Task<IActionResult> GetFichaPdf(int id)
    {
        var ca = await WithIncludes().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (ca is null) return NotFound();

        try
        {
            var bytes = _fichaPdfBuilder.BuildOne(ToDto(ca));
            return File(bytes, PdfContentType, FichaFileName(ca.Student, "pdf"));
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status500InternalServerError, title: "No se pudo generar el PDF");
        }
    }

    /// <summary>
    /// GET /api/course-assignments/ficha-batch.pdf?from=&amp;to=&amp;tipoPago= — same filters as GetAll,
    /// one combined PDF with every matching ficha's page(s) in order ("Imprimir todas" — one print job).
    /// </summary>
    [HttpGet("ficha-batch.pdf")]
    public async Task<IActionResult> GetFichaBatchPdf(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? tipoPago)
    {
        var query = WithIncludes().AsNoTracking().AsQueryable();
        if (from.HasValue) query = query.Where(ca => ca.Fecha >= from.Value);
        if (to.HasValue) query = query.Where(ca => ca.Fecha <= to.Value);
        if (!string.IsNullOrWhiteSpace(tipoPago)) query = query.Where(ca => ca.TipoPago == tipoPago);

        var results = await query.OrderBy(ca => ca.Student!.PrimerApellido).ToListAsync();
        if (results.Count == 0) return NotFound("No hay fichas para ese rango/filtro.");

        try
        {
            var bytes = _fichaPdfBuilder.BuildBatch(results.Select(ToDto).ToList());
            return File(bytes, PdfContentType, "Fichas.pdf");
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status500InternalServerError, title: "No se pudo generar el PDF");
        }
    }

    private const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private const string PdfContentType = "application/pdf";

    private static string FichaFileName(Student? student)
    {
        var label = student is null ? "ficha" : $"{student.Carnet} - {student.PrimerApellido} {student.PrimerNombre}";
        var sanitized = string.Concat(label.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c));
        return $"Ficha - {sanitized}.xlsx";
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ca = await _db.CourseAssignments.FirstOrDefaultAsync(x => x.Id == id);
        if (ca is null) return NotFound();

        _db.CourseAssignments.Remove(ca);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
