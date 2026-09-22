using System.ComponentModel.DataAnnotations;

namespace UmesIsel.Api.Models.Entities;

/// <summary>
/// Una cohorte: el grupo de personas que INICIA sus estudios en un mismo período
/// (por ejemplo, "Cohorte 2026" o "Cohorte 2027-2"). Es una dimensión de tiempo
/// independiente de la carrera: la maestría es una sola, y lo que cambia con los
/// años es la cohorte con la que se entra.
///
/// Sirve para tres cosas:
/// · el aspirante elige carrera + cohorte al inscribirse (solo las que están
///   abiertas, ver <see cref="AbiertaInscripcion"/>);
/// · cada alumno del padrón queda ligado a su cohorte (<see cref="Student.CohorteId"/>);
/// · el pénsum de una carrera puede cambiar a partir de una cohorte sin crear
///   una "carrera 2027" aparte: los cursos llevan la cohorte desde la que están
///   vigentes (<see cref="Course.CohorteId"/>), y a cada alumno le toca la versión
///   que corresponde a su cohorte (ver <c>PensumService.ResolverVersion</c>).
/// </summary>
public class Cohorte
{
    public int Id { get; set; }

    /// <summary>Año de inicio. Coincide con los cuatro primeros dígitos del carné que reciben.</summary>
    public int Anio { get; set; }

    /// <summary>Número de ingreso dentro del año (1 = primer ingreso, 2 = segundo...). Casi siempre 1.</summary>
    public int Periodo { get; set; } = 1;

    /// <summary>Cómo se muestra en formularios y listados: "Cohorte 2026", "Cohorte 2027-2".</summary>
    [MaxLength(80)]
    public string Nombre { get; set; } = string.Empty;

    /// <summary>Fecha en que inician clases. Informativa: se muestra al aspirante al elegir.</summary>
    public DateOnly? FechaInicio { get; set; }

    /// <summary>
    /// true = aparece en el formulario de inscripción de nuevo ingreso. Se abre cuando
    /// empieza la convocatoria y se cierra cuando termina, sin borrar nada.
    /// </summary>
    public bool AbiertaInscripcion { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Clave de orden cronológico: la cohorte 2026-2 va después de la 2026-1 y antes de la 2027-1.</summary>
    public int Clave => Anio * 10 + Periodo;

    public static string NombrePorDefecto(int anio, int periodo) =>
        periodo <= 1 ? $"Cohorte {anio}" : $"Cohorte {anio}-{periodo}";
}
