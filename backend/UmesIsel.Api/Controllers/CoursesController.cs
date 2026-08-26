using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// Course catalog the admin maintains per carrera (Panel administrativo →
/// Cursos). Students pick from this instead of typing course names by hand.
/// </summary>
[ApiController]
[Route("api/courses")]
public class CoursesController : ControllerBase
{
    private readonly IselDbContext _db;

    public CoursesController(IselDbContext db) => _db = db;

    private static CourseDto ToDto(Course c) => new(c.Id, c.Carrera, c.Nombre);

    /// <summary>GET /api/courses?carrera=X — omit carrera to get the full cross-program catalog ("cursos adicionales").</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CourseDto>>> GetAll([FromQuery] string? carrera)
    {
        var query = _db.Courses.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(carrera))
        {
            query = query.Where(c => c.Carrera == carrera);
        }
        var courses = await query.OrderBy(c => c.Carrera).ThenBy(c => c.Nombre).ToListAsync();
        return Ok(courses.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<CourseDto>> Create(CourseUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre) || string.IsNullOrWhiteSpace(request.Carrera))
        {
            return BadRequest("Carrera y nombre del curso son obligatorios.");
        }

        var course = new Course { Carrera = request.Carrera.Trim(), Nombre = request.Nombre.Trim() };
        _db.Courses.Add(course);
        await _db.SaveChangesAsync();
        return Ok(ToDto(course));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CourseDto>> Update(int id, CourseUpsertRequest request)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course is null) return NotFound();

        course.Carrera = request.Carrera.Trim();
        course.Nombre = request.Nombre.Trim();
        await _db.SaveChangesAsync();
        return Ok(ToDto(course));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course is null) return NotFound();

        _db.Courses.Remove(course);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
