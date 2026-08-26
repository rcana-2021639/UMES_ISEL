using System.ComponentModel.DataAnnotations;

namespace UmesIsel.Api.Models.Entities;

/// <summary>
/// One entry in the course catalog the admin maintains per carrera (Panel
/// administrativo → Cursos). Students pick from this list instead of typing
/// a course name by hand, so "Cursos por asignarse" can't have typos.
/// </summary>
public class Course
{
    public int Id { get; set; }

    [MaxLength(200)]
    public string Carrera { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
