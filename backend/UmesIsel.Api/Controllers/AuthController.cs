using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;

namespace UmesIsel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IselDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(IselDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    /// <summary>
    /// POST /api/auth/login — single field, no password. If it matches the
    /// configured admin code -> role "admin". If it matches a student's
    /// carné -> role "student" with their data. Otherwise 404.
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var value = (request.Value ?? string.Empty).Trim();
        if (value.Length == 0)
        {
            return BadRequest("Ingresa tu carné.");
        }

        var adminCode = _config["AdminAccess:Code"];
        if (!string.IsNullOrEmpty(adminCode) && string.Equals(value, adminCode, StringComparison.OrdinalIgnoreCase))
        {
            return Ok(new LoginResponse("admin", null));
        }

        var student = await _db.Students.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Carnet == value);

        if (student is null)
        {
            return NotFound("No encontramos ese carné. Verifica el número e intenta de nuevo.");
        }

        var documentosSubidos = await _db.StudentDocuments.CountAsync(d => d.StudentId == student.Id);
        var dto = new StudentDto(
            student.Id, student.Carnet, student.PrimerApellido, student.SegundoApellido,
            student.PrimerNombre, student.SegundoNombre, student.NombreCompleto, student.Carrera,
            student.Seccion, student.Trimestre, student.CorreoInstitucional, student.CorreoPersonal, student.Celular,
            student.PapeleriaEnOrden, documentosSubidos);

        return Ok(new LoginResponse("student", dto));
    }
}
