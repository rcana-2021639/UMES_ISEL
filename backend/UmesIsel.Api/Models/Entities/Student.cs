using System.ComponentModel.DataAnnotations;

namespace UmesIsel.Api.Models.Entities;

/// <summary>
/// A student/alumno enrolled in an ISEL program. <see cref="Carnet"/> is the
/// login key used on the public portal (no password — see AuthController).
/// </summary>
public class Student
{
    public int Id { get; set; }

    [MaxLength(20)]
    public string Carnet { get; set; } = string.Empty;

    [MaxLength(120)]
    public string PrimerApellido { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? SegundoApellido { get; set; }

    [MaxLength(120)]
    public string PrimerNombre { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? SegundoNombre { get; set; }

    /// <summary>Denormalized "Apellidos, Nombres" convenience field kept in sync on save.</summary>
    [MaxLength(250)]
    public string NombreCompleto { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Carrera { get; set; } = string.Empty;

    [MaxLength(10)]
    public string? Seccion { get; set; }

    public int? Trimestre { get; set; }

    [MaxLength(150)]
    public string? CorreoInstitucional { get; set; }

    [MaxLength(150)]
    public string? CorreoPersonal { get; set; }

    [MaxLength(30)]
    public string? Celular { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<CourseAssignment> CourseAssignments { get; set; } = new();
}
