using System.ComponentModel.DataAnnotations;

namespace UmesIsel.Api.Models.Entities;

/// <summary>
/// One "Ficha de Asignación de Cursos" — mirrors the printed form exactly:
/// student header data, the "cursos por asignarse" grid, the "cursos
/// adicionales o cambio de sección" grid, observations, digital signature
/// and contact fields.
/// </summary>
public class CourseAssignment
{
    public int Id { get; set; }

    public int StudentId { get; set; }
    public Student? Student { get; set; }

    public DateOnly Fecha { get; set; }
    public int Trimestre { get; set; }

    [MaxLength(200)]
    public string Carrera { get; set; } = string.Empty;

    public bool TienePendientesTrimestres { get; set; }
    public bool TienePendientesMaterias { get; set; }

    [MaxLength(150)]
    public string? CorreoContacto { get; set; }

    [MaxLength(30)]
    public string? TelefonoContacto { get; set; }

    [MaxLength(50)]
    public string? ComprobantePagoNo { get; set; }

    /// <summary>PNG signature captured on the canvas signature pad, as a data: URL.</summary>
    public string? FirmaBase64 { get; set; }
    public DateTime? FirmadoEn { get; set; }

    /// <summary>Admin access code that authorized/last touched this record (audit trail, not a real auth token).</summary>
    [MaxLength(50)]
    public string? AutorizadoPorCodigo { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<AssignedCourseRow> CursosAsignados { get; set; } = new();
    public List<AdditionalCourseRow> CursosAdicionales { get; set; } = new();
}

/// <summary>A row in the "Cursos por asignarse" grid (up to 10 per ficha).</summary>
public class AssignedCourseRow
{
    public int Id { get; set; }
    public int CourseAssignmentId { get; set; }
    public CourseAssignment? CourseAssignment { get; set; }

    public int Numero { get; set; }

    [MaxLength(200)]
    public string Curso { get; set; } = string.Empty;

    [MaxLength(10)]
    public string? SemTri { get; set; }

    [MaxLength(10)]
    public string? Seccion { get; set; }
}

/// <summary>A row in the "Cursos adicionales o cambio de sección" grid (up to 5 per ficha).</summary>
public class AdditionalCourseRow
{
    public int Id { get; set; }
    public int CourseAssignmentId { get; set; }
    public CourseAssignment? CourseAssignment { get; set; }

    public int Numero { get; set; }

    [MaxLength(200)]
    public string CursoAdicional { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Carrera { get; set; }

    [MaxLength(10)]
    public string? SemTri { get; set; }

    [MaxLength(10)]
    public string? Seccion { get; set; }

    [MaxLength(30)]
    public string? Jornada { get; set; }
}
