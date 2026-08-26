using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// The "Ficha de Asignación de Cursos": students save their own (portal),
/// the admin panel lists/prints/filters them by date range or by carrera+trimestre.
/// </summary>
[ApiController]
[Route("api/course-assignments")]
public class CourseAssignmentsController : ControllerBase
{
    private readonly IselDbContext _db;

    public CourseAssignmentsController(IselDbContext db) => _db = db;

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
        ca.Student?.Seccion,
        ca.CursosAsignados.OrderBy(r => r.Numero).Select(r => new AssignedCourseRowDto(r.Numero, r.Curso, r.SemTri, r.Seccion)).ToList(),
        ca.CursosAdicionales.OrderBy(r => r.Numero).Select(r => new AdditionalCourseRowDto(r.Numero, r.CursoAdicional, r.Carrera, r.SemTri, r.Seccion, r.Jornada)).ToList(),
        ca.TienePendientesTrimestres,
        ca.TienePendientesMaterias,
        ca.CorreoContacto,
        ca.TelefonoContacto,
        ca.ComprobantePagoNo,
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

    /// <summary>GET /api/course-assignments/status?carrera=X&trimestre=3 — one row per student in that carrera+trimestre, "Enviada"/"Pendiente".</summary>
    [HttpGet("status")]
    public async Task<ActionResult<IReadOnlyList<object>>> GetStatus([FromQuery] string carrera, [FromQuery] int trimestre)
    {
        if (string.IsNullOrWhiteSpace(carrera))
        {
            return BadRequest("Selecciona una carrera.");
        }

        var students = await _db.Students.AsNoTracking()
            .Where(s => s.Carrera == carrera && s.Trimestre == trimestre)
            .ToListAsync();

        var studentIds = students.Select(s => s.Id).ToList();
        var assignedIds = await _db.CourseAssignments.AsNoTracking()
            .Where(ca => studentIds.Contains(ca.StudentId) && ca.Trimestre == trimestre)
            .Select(ca => ca.StudentId)
            .ToListAsync();
        var assignedSet = assignedIds.ToHashSet();

        var rows = students
            .OrderBy(s => s.PrimerApellido)
            .Select(s => new
            {
                estado = assignedSet.Contains(s.Id) ? "Enviada" : "Pendiente",
                carnet = s.Carnet,
                alumno = s.NombreCompleto,
                carrera = s.Carrera,
                semTri = s.Trimestre,
            });

        return Ok(rows);
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
    /// POST /api/course-assignments — upsert by (carné, trimestre). The student portal's
    /// "Guardar asignación" and the admin's edit view both call this.
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
            .FirstOrDefaultAsync(ca => ca.StudentId == student.Id && ca.Trimestre == request.Trimestre);

        var now = DateTime.UtcNow;
        CourseAssignment ca;

        if (existing is null)
        {
            ca = new CourseAssignment
            {
                StudentId = student.Id,
                Fecha = DateOnly.FromDateTime(DateTime.Now),
                Trimestre = request.Trimestre,
                Carrera = student.Carrera,
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

        ca.TienePendientesTrimestres = request.TienePendientesTrimestres;
        ca.TienePendientesMaterias = request.TienePendientesMaterias;
        ca.CorreoContacto = request.CorreoContacto?.Trim();
        ca.TelefonoContacto = request.TelefonoContacto?.Trim();
        ca.ComprobantePagoNo = request.ComprobantePagoNo?.Trim();
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
