using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Services;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// Catálogo del pénsum — una fila por (carrera, trimestre, curso). Es de solo
/// lectura desde aquí: quien lo edita es el panel de admin, pestaña "Pénsum"
/// (ver <see cref="PensumController"/>), y lo que se guarde ahí sale por estos
/// mismos endpoints sin ningún paso intermedio.
///
/// Los dos endpoints reciben la cohorte de quien llena la ficha: el pénsum de una
/// carrera puede tener varias versiones (una por cada cambio de plan), y a cada
/// quien le toca la de su cohorte — ver <see cref="PensumService.ResolverVersion"/>.
/// Sin cohorte, sale la versión vigente hoy.
/// </summary>
[ApiController]
[Route("api/courses")]
public class CoursesController : ControllerBase
{
    private readonly IselDbContext _db;
    private readonly PensumService _pensum;

    public CoursesController(IselDbContext db, PensumService pensum)
    {
        _db = db;
        _pensum = pensum;
    }

    /// <summary>
    /// GET /api/courses?carrera=X&amp;trimestre=3&amp;cohorteId=5 — omite carrera y
    /// trimestre para el catálogo completo entre carreras ("cursos adicionales").
    ///
    /// Sin filtro de carrera se saltan las carreras archivadas: el catálogo es
    /// para elegir, y una carrera archivada ya no se ofrece. Si se pide una
    /// carrera por nombre sí se devuelve aunque esté archivada — es el caso del
    /// alumno que sigue cursando una carrera que ya se cerró a nuevos ingresos,
    /// y sin esto su ficha saldría sin un solo curso.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CourseDto>>> GetAll(
        [FromQuery] string? carrera, [FromQuery] int? trimestre, [FromQuery] int? cohorteId)
    {
        var courses = await _pensum.CursosVigentesAsync(carrera, cohorteId, excluirArchivadas: true);

        if (trimestre.HasValue)
        {
            courses = courses.Where(c => c.Trimestre == trimestre.Value).ToList();
        }

        // El orden de las carreras es el que fijó el admin en la pestaña "Pénsum";
        // dentro de cada una, por trimestre y por el orden en que se agregaron los
        // cursos (que es el orden en que se cursan, no el alfabético).
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

    /// <summary>GET /api/courses/trimestres?carrera=X&amp;cohorteId=5 — los trimestres que tiene la versión del pénsum de esa cohorte.</summary>
    [HttpGet("trimestres")]
    public async Task<ActionResult<IReadOnlyList<int>>> GetTrimestres([FromQuery] string carrera, [FromQuery] int? cohorteId)
    {
        if (string.IsNullOrWhiteSpace(carrera))
        {
            return BadRequest("Selecciona una carrera.");
        }
        var cursos = await _pensum.CursosVigentesAsync(carrera, cohorteId, excluirArchivadas: false);
        return Ok(cursos.Select(c => c.Trimestre).Distinct().OrderBy(t => t).ToList());
    }
}
