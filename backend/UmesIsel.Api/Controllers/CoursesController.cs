using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// Official pensum catalog — one entry per (carrera, trimestre, curso),
/// seeded from each program's published pensum PDF (see
/// Data/CourseCatalogSeedData.cs). Read-only: there is no admin UI to edit
/// this anymore, it's authoritative and sourced from the pensum documents.
/// </summary>
[ApiController]
[Route("api/courses")]
public class CoursesController : ControllerBase
{
    private readonly IselDbContext _db;

    public CoursesController(IselDbContext db) => _db = db;

    /// <summary>GET /api/courses?carrera=X&trimestre=3 — omit both for the full cross-program catalog ("cursos adicionales").</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CourseDto>>> GetAll([FromQuery] string? carrera, [FromQuery] int? trimestre)
    {
        var query = _db.Courses.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(carrera))
        {
            query = query.Where(c => c.Carrera == carrera);
        }
        if (trimestre.HasValue)
        {
            query = query.Where(c => c.Trimestre == trimestre.Value);
        }
        var courses = await query.OrderBy(c => c.Carrera).ThenBy(c => c.Trimestre).ThenBy(c => c.Nombre).ToListAsync();
        return Ok(courses.Select(c => new CourseDto(c.Id, c.Carrera, c.Trimestre, c.Nombre)).ToList());
    }

    /// <summary>GET /api/courses/trimestres?carrera=X — the distinct trimestres that carrera's pensum has, in order.</summary>
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
