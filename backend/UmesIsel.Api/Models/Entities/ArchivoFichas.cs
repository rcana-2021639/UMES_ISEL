using System.ComponentModel.DataAnnotations;

namespace UmesIsel.Api.Models.Entities;

/// <summary>
/// Un reinicio de asignaciones y el ZIP que dejó.
///
/// Las asignaciones van por temporadas: se abren, entran las fichas, se imprimen y se entregan, y
/// luego pasan semanas sin que nadie asigne nada. Para la siguiente temporada el panel tiene que
/// arrancar limpio —ningún alumno "ya asignado", ninguna ficha vieja en la tabla—, pero lo que
/// importa de esas fichas, el PDF, no puede perderse. Cada reinicio guarda primero todos los PDF
/// en un ZIP que se queda en el servidor, y solo entonces borra las fichas.
/// </summary>
public class ArchivoFichas
{
    public int Id { get; set; }

    /// <summary>Cómo lo nombró quien reinició: "cuarto trimestre 2026", por ejemplo.</summary>
    [MaxLength(120)]
    public string Etiqueta { get; set; } = string.Empty;

    /// <summary><see cref="EstadosArchivoFichas"/>.</summary>
    [MaxLength(20)]
    public string Estado { get; set; } = EstadosArchivoFichas.Generando;

    public int CantidadFichas { get; set; }

    /// <summary>Nombre del ZIP dentro de la carpeta del archivo; null mientras se genera o si falló.</summary>
    [MaxLength(120)]
    public string? NombreArchivo { get; set; }

    public long Bytes { get; set; }

    /// <summary>Por qué falló, en palabras para el panel. Si falla, las fichas NO se borran.</summary>
    [MaxLength(400)]
    public string? Error { get; set; }

    [MaxLength(120)]
    public string CreadoPor { get; set; } = string.Empty;

    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public DateTime? TerminadoEn { get; set; }
}

public static class EstadosArchivoFichas
{
    public const string Generando = "generando";
    public const string Listo = "listo";
    public const string Error = "error";
}
