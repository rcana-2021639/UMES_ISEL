using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;

namespace UmesIsel.Api.Controllers;

/// <summary>Admin CRUD over the student roster (used by the "Panel administrativo").</summary>
[ApiController]
[Route("api/[controller]")]
public class StudentsController : ControllerBase
{
    private readonly IselDbContext _db;

    public StudentsController(IselDbContext db) => _db = db;

    private static StudentDto ToDto(Student s, int documentosSubidos = 0) => new(
        s.Id, s.Carnet, s.PrimerApellido, s.SegundoApellido, s.PrimerNombre, s.SegundoNombre,
        s.NombreCompleto, s.Carrera, s.Seccion, s.Trimestre, s.CorreoInstitucional, s.CorreoPersonal, s.Celular,
        s.PapeleriaEnOrden, documentosSubidos);

    private async Task<int> CountDocumentos(int studentId) =>
        await _db.StudentDocuments.CountAsync(d => d.StudentId == studentId);

    private static string BuildNombreCompleto(string primerApellido, string? segundoApellido, string primerNombre, string? segundoNombre)
    {
        var apellidos = string.Join(' ', new[] { primerApellido, segundoApellido }.Where(s => !string.IsNullOrWhiteSpace(s)));
        var nombres = string.Join(' ', new[] { primerNombre, segundoNombre }.Where(s => !string.IsNullOrWhiteSpace(s)));
        return $"{apellidos}, {nombres}";
    }

    /// <summary>GET /api/students?carnet=&carrera= — list, optionally filtered (used by the admin table's search).</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StudentDto>>> GetAll([FromQuery] string? carnet, [FromQuery] string? carrera)
    {
        var query = _db.Students.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(carnet))
        {
            query = query.Where(s => s.Carnet.Contains(carnet));
        }
        if (!string.IsNullOrWhiteSpace(carrera))
        {
            query = query.Where(s => s.Carrera == carrera);
        }

        var students = await query.OrderBy(s => s.PrimerApellido).ThenBy(s => s.PrimerNombre).ToListAsync();

        var ids = students.Select(s => s.Id).ToList();
        var counts = await _db.StudentDocuments.AsNoTracking()
            .Where(d => ids.Contains(d.StudentId))
            .GroupBy(d => d.StudentId)
            .Select(g => new { StudentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.StudentId, x => x.Count);

        return Ok(students.Select(s => ToDto(s, counts.GetValueOrDefault(s.Id))).ToList());
    }

    /// <summary>GET /api/students/carreras — distinct carrera values, for the admin's filter dropdown.</summary>
    [HttpGet("carreras")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetCarreras()
    {
        var carreras = await _db.Students.AsNoTracking()
            .Select(s => s.Carrera)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
        return Ok(carreras);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<StudentDto>> GetById(int id)
    {
        var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
        return student is null ? NotFound() : Ok(ToDto(student, await CountDocumentos(id)));
    }

    [HttpGet("by-carnet/{carnet}")]
    public async Task<ActionResult<StudentDto>> GetByCarnet(string carnet)
    {
        var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Carnet == carnet);
        return student is null ? NotFound() : Ok(ToDto(student, await CountDocumentos(student.Id)));
    }

    /// <summary>PUT /api/students/{id}/papeleria-en-orden — "¿Tiene su papelería al día?"; en Sí, el panel deja de pedir subir documentos.</summary>
    [HttpPut("{id:int}/papeleria-en-orden")]
    public async Task<ActionResult<StudentDto>> SetPapeleriaEnOrden(int id, PapeleriaEnOrdenRequest request)
    {
        var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == id);
        if (student is null) return NotFound();

        student.PapeleriaEnOrden = request.EnOrden;
        student.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ToDto(student, await CountDocumentos(id)));
    }

    /// <summary>POST /api/students — admin "Agregar alumno", no need to touch la base de datos a mano.</summary>
    [HttpPost]
    public async Task<ActionResult<StudentDto>> Create(StudentUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Carnet))
        {
            return BadRequest("El carné es obligatorio.");
        }

        var exists = await _db.Students.AnyAsync(s => s.Carnet == request.Carnet);
        if (exists)
        {
            return Conflict("Ya existe un alumno con ese carné.");
        }

        var now = DateTime.UtcNow;
        var student = new Student
        {
            Carnet = request.Carnet.Trim(),
            PrimerApellido = request.PrimerApellido.Trim(),
            SegundoApellido = request.SegundoApellido?.Trim(),
            PrimerNombre = request.PrimerNombre.Trim(),
            SegundoNombre = request.SegundoNombre?.Trim(),
            NombreCompleto = BuildNombreCompleto(request.PrimerApellido, request.SegundoApellido, request.PrimerNombre, request.SegundoNombre),
            Carrera = request.Carrera.Trim(),
            Seccion = request.Seccion?.Trim(),
            Trimestre = request.Trimestre,
            CorreoInstitucional = request.CorreoInstitucional?.Trim(),
            CorreoPersonal = request.CorreoPersonal?.Trim(),
            Celular = request.Celular?.Trim(),
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.Students.Add(student);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = student.Id }, ToDto(student));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<StudentDto>> Update(int id, StudentUpsertRequest request)
    {
        var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == id);
        if (student is null) return NotFound();

        var carnetTaken = await _db.Students.AnyAsync(s => s.Carnet == request.Carnet && s.Id != id);
        if (carnetTaken)
        {
            return Conflict("Ese carné ya pertenece a otro alumno.");
        }

        student.Carnet = request.Carnet.Trim();
        student.PrimerApellido = request.PrimerApellido.Trim();
        student.SegundoApellido = request.SegundoApellido?.Trim();
        student.PrimerNombre = request.PrimerNombre.Trim();
        student.SegundoNombre = request.SegundoNombre?.Trim();
        student.NombreCompleto = BuildNombreCompleto(request.PrimerApellido, request.SegundoApellido, request.PrimerNombre, request.SegundoNombre);
        student.Carrera = request.Carrera.Trim();
        student.Seccion = request.Seccion?.Trim();
        student.Trimestre = request.Trimestre;
        student.CorreoInstitucional = request.CorreoInstitucional?.Trim();
        student.CorreoPersonal = request.CorreoPersonal?.Trim();
        student.Celular = request.Celular?.Trim();
        student.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ToDto(student, await CountDocumentos(student.Id)));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == id);
        if (student is null) return NotFound();

        _db.Students.Remove(student);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
