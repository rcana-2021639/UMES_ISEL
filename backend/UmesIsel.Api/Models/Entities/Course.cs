using System.ComponentModel.DataAnnotations;

namespace UmesIsel.Api.Models.Entities;

/// <summary>
/// One course in a carrera's official pensum, seeded from the program's
/// published pensum PDF (see Data/CourseCatalogSeedData.cs) — Carrera +
/// Trimestre together decide which courses "Cursos por asignarse"
/// auto-includes once a student picks that trimestre, and the full list
/// (grouped by Carrera/Trimestre) is what "Cursos adicionales" searches.
/// </summary>
public class Course
{
    public int Id { get; set; }

    [MaxLength(200)]
    public string Carrera { get; set; } = string.Empty;

    public int Trimestre { get; set; }

    /// <summary>
    /// Desde qué cohorte está vigente este curso — es decir, a qué VERSIÓN del pénsum
    /// pertenece. null = la versión original de la carrera, vigente desde siempre.
    /// Cuando el plan de estudios cambia para los que entran en 2027, no se crea otra
    /// carrera: se agrega una versión con CohorteId = cohorte 2027, y cada alumno ve la
    /// versión que le toca por su cohorte (ver <c>PensumService.ResolverVersion</c>).
    /// </summary>
    public int? CohorteId { get; set; }
    public Cohorte? Cohorte { get; set; }

    [MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
