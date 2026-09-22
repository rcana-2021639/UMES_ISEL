using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;
using UmesIsel.Api.Security;
using UmesIsel.Api.Services;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// Las cohortes (ver <see cref="Cohorte"/>): cuándo empieza cada grupo de ingreso.
///
/// El listado es público porque el aspirante, que todavía no tiene cuenta, tiene
/// que ver en qué cohortes puede inscribirse. Todo lo que escribe es del admin.
/// </summary>
[ApiController]
[Route("api/cohortes")]
[RequireAdmin]
public class CohortesController : ControllerBase
{
    private readonly IselDbContext _db;
    private readonly AuditService _audit;

    public CohortesController(IselDbContext db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    private static CohorteDto ToDto(Cohorte c) => new(c.Id, c.Anio, c.Periodo, c.Nombre, c.FechaInicio, c.AbiertaInscripcion);

    /// <summary>GET /api/cohortes?abiertas=true — en orden cronológico. Con abiertas=true, solo las que reciben inscripciones.</summary>
    [HttpGet]
    [AllowAnonymousAccess]
    public async Task<ActionResult<IReadOnlyList<CohorteDto>>> GetAll([FromQuery] bool abiertas = false)
    {
        var query = _db.Cohortes.AsNoTracking().AsQueryable();
        if (abiertas) query = query.Where(c => c.AbiertaInscripcion);
        var lista = await query.OrderBy(c => c.Anio).ThenBy(c => c.Periodo).ToListAsync();
        return Ok(lista.Select(ToDto).ToList());
    }

    /// <summary>GET /api/cohortes/admin — con cuántos alumnos, aspirantes y versiones del pénsum usan cada una.</summary>
    [HttpGet("admin")]
    public async Task<ActionResult<IReadOnlyList<CohorteAdminDto>>> GetAdmin() => Ok(await ListadoAdminAsync());

    private async Task<List<CohorteAdminDto>> ListadoAdminAsync()
    {
        var cohortes = await _db.Cohortes.AsNoTracking().OrderBy(c => c.Anio).ThenBy(c => c.Periodo).ToListAsync();

        var alumnos = await _db.Students.Where(s => s.CohorteId != null)
            .GroupBy(s => s.CohorteId!.Value).Select(g => new { g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.N);
        var aspirantes = await _db.Preinscripciones.Where(p => p.CohorteId != null && p.Applicant!.MigradoStudentId == null)
            .GroupBy(p => p.CohorteId!.Value).Select(g => new { g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.N);
        var versiones = await _db.Courses.Where(c => c.CohorteId != null)
            .Select(c => new { c.CohorteId, c.Carrera }).Distinct()
            .GroupBy(x => x.CohorteId!.Value).Select(g => new { g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.N);

        return cohortes.Select(c => new CohorteAdminDto(
            c.Id, c.Anio, c.Periodo, c.Nombre, c.FechaInicio, c.AbiertaInscripcion,
            alumnos.GetValueOrDefault(c.Id), aspirantes.GetValueOrDefault(c.Id), versiones.GetValueOrDefault(c.Id))).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<IReadOnlyList<CohorteAdminDto>>> Crear(CohorteUpsertRequest request)
    {
        var error = Validar(request);
        if (error is not null) return BadRequest(error);
        if (await _db.Cohortes.AnyAsync(c => c.Anio == request.Anio && c.Periodo == request.Periodo))
        {
            return Conflict($"Ya existe la {Cohorte.NombrePorDefecto(request.Anio, request.Periodo)}.");
        }

        var cohorte = new Cohorte
        {
            Anio = request.Anio,
            Periodo = request.Periodo,
            Nombre = NombreDe(request),
            FechaInicio = request.FechaInicio,
            AbiertaInscripcion = request.AbiertaInscripcion,
        };
        _db.Cohortes.Add(cohorte);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(SecurityEventTypes.PensumModificado, $"cohorte creada: {cohorte.Nombre}");
        return Ok(await ListadoAdminAsync());
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<IReadOnlyList<CohorteAdminDto>>> Actualizar(int id, CohorteUpsertRequest request)
    {
        var cohorte = await _db.Cohortes.FirstOrDefaultAsync(c => c.Id == id);
        if (cohorte is null) return NotFound("Esa cohorte ya no existe.");

        var error = Validar(request);
        if (error is not null) return BadRequest(error);
        if (await _db.Cohortes.AnyAsync(c => c.Id != id && c.Anio == request.Anio && c.Periodo == request.Periodo))
        {
            return Conflict($"Ya existe otra {Cohorte.NombrePorDefecto(request.Anio, request.Periodo)}.");
        }

        cohorte.Anio = request.Anio;
        cohorte.Periodo = request.Periodo;
        cohorte.Nombre = NombreDe(request);
        cohorte.FechaInicio = request.FechaInicio;
        cohorte.AbiertaInscripcion = request.AbiertaInscripcion;
        cohorte.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(SecurityEventTypes.PensumModificado,
            $"cohorte #{id} modificada: {cohorte.Nombre} ({(cohorte.AbiertaInscripcion ? "abierta" : "cerrada")} a inscripciones)");
        return Ok(await ListadoAdminAsync());
    }

    /// <summary>Solo si nadie la usa: ni alumnos, ni aspirantes, ni una versión del pénsum. Si la usan, se cierra en vez de borrarse.</summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<IReadOnlyList<CohorteAdminDto>>> Eliminar(int id)
    {
        var cohorte = await _db.Cohortes.FirstOrDefaultAsync(c => c.Id == id);
        if (cohorte is null) return NotFound("Esa cohorte ya no existe.");

        var alumnos = await _db.Students.CountAsync(s => s.CohorteId == id);
        var aspirantes = await _db.Preinscripciones.CountAsync(p => p.CohorteId == id);
        var cursos = await _db.Courses.CountAsync(c => c.CohorteId == id);
        if (alumnos + aspirantes + cursos > 0)
        {
            var partes = new List<string>();
            if (alumnos > 0) partes.Add($"{alumnos} alumno{(alumnos == 1 ? "" : "s")}");
            if (aspirantes > 0) partes.Add($"{aspirantes} aspirante{(aspirantes == 1 ? "" : "s")}");
            if (cursos > 0) partes.Add("una versión del pénsum");
            return Conflict($"No se puede eliminar la {cohorte.Nombre}: la usan {string.Join(", ", partes)}. " +
                            "Ciérrala a inscripciones para que deje de ofrecerse.");
        }

        _db.Cohortes.Remove(cohorte);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(SecurityEventTypes.RegistroEliminado, $"cohorte {cohorte.Nombre}", esAlerta: true);
        return Ok(await ListadoAdminAsync());
    }

    private static string? Validar(CohorteUpsertRequest r)
    {
        if (r.Anio < 2000 || r.Anio > 2099) return "El año de la cohorte tiene que estar entre 2000 y 2099.";
        if (r.Periodo < 1 || r.Periodo > 9) return "El número de ingreso dentro del año tiene que estar entre 1 y 9.";
        if ((r.Nombre?.Trim().Length ?? 0) > 80) return "El nombre no puede pasar de 80 caracteres.";
        return null;
    }

    private static string NombreDe(CohorteUpsertRequest r) =>
        string.IsNullOrWhiteSpace(r.Nombre) ? Cohorte.NombrePorDefecto(r.Anio, r.Periodo) : r.Nombre.Trim();
}
