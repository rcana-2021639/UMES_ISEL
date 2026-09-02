using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// Catálogo del pénsum — una fila por (carrera, trimestre, curso). Es de solo
/// lectura desde aquí: quien lo edita es el panel de admin, pestaña "Pénsum"
/// (ver <see cref="PensumController"/>), y lo que se guarde ahí sale por estos
/// mismos endpoints sin ningún paso intermedio.
/// </summary>
[ApiController]
[Route("api/courses")]
public class CoursesController : ControllerBase
{
    private readonly IselDbContext _db;

    public CoursesController(IselDbContext db) => _db = db;

    /// <summary>
    /// GET /api/courses?carrera=X&amp;trimestre=3 — omite las dos para el catálogo
    /// completo entre carreras ("cursos adicionales").
    ///
    /// Sin filtro de carrera se saltan las carreras archivadas: el catálogo es
    /// para elegir, y una carrera archivada ya no se ofrece. Si se pide una
    /// carrera por nombre sí se devuelve aunque esté archivada — es el caso del
    /// alumno que sigue cursando una carrera que ya se cerró a nuevos ingresos,
    /// y sin esto su ficha saldría sin un solo curso.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CourseDto>>> GetAll([FromQuery] string? carrera, [FromQuery] int? trimestre)
    {
        var query = _db.Courses.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(carrera))
        {
            query = query.Where(c => c.Carrera == carrera);
        }
        else
        {
            var archivadas = _db.Carreras.AsNoTracking().Where(x => !x.Activa).Select(x => x.Nombre);
            query = query.Where(c => !archivadas.Contains(c.Carrera));
        }

        if (trimestre.HasValue)
        {
            query = query.Where(c => c.Trimestre == trimestre.Value);
        }

        // El orden de las carreras es el que fijó el admin en la pestaña "Pénsum";
        // dentro de cada una, por trimestre y por el orden en que se agregaron los
        // cursos (que es el orden en que se cursan, no el alfabético).
        var courses = await query.ToListAsync();
        var orden = await _db.Carreras.AsNoTracking()
            .ToDictionaryAsync(c => c.Nombre, c => c.Orden, StringComparer.OrdinalIgnoreCase);

        var ordenados = courses
            .OrderBy(c => orden.GetValueOrDefault(c.Carrera, int.MaxValue))
            .ThenBy(c => c.Carrera, StringComparer.OrdinalIgnoreCase)
            .ThenBy(c => c.Trimestre)
            .ThenBy(c => c.Id)
            .Select(c => new CourseDto(c.Id, c.Carrera, c.Trimestre, c.Nombre))
            .ToList();

        return Ok(ordenados);
    }

    /// <summary>GET /api/courses/trimestres?carrera=X — los trimestres que ese pénsum tiene, en orden.</summary>
    [HttpGet("trimestres")]
    public async Task<ActionResult<IReadOnlyList<int>>> GetTrimestres([FromQuery] string carrera)
    {
        if (string.IsNullOrWhiteSpace(carrera))
        {
            return BadRequest("Selecciona una carrera.");
        }
        var trimestres = await _db.Courses.AsNoTracking()
            .Where(c => c.Carrera == carrera)
            .Select(c => c.Trimestre)
            .Distinct()
            .OrderBy(t => t)
            .ToListAsync();
        return Ok(trimestres);
    }
}
