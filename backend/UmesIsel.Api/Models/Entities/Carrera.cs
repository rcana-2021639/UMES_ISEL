using System.ComponentModel.DataAnnotations;

namespace UmesIsel.Api.Models.Entities;

/// <summary>
/// Registro de carreras/programas del pénsum. Es la lista maestra que
/// alimenta los tres trámites (asignación, inscripción y solicitud de
/// título) y la única que el admin edita desde la pestaña "Pénsum".
///
/// Los cursos (<see cref="Course"/>) siguen guardando el nombre de la
/// carrera como texto — no hay FK — porque toda la app ya consulta por
/// nombre y cambiar eso obligaría a reconstruir tablas en SQLite. La copia
/// se mantiene sincronizada en un solo sitio: <c>PensumService.RenameCarrera</c>,
/// que renombra en la misma transacción los cursos y los expedientes vivos.
/// </summary>
public class Carrera
{
    public int Id { get; set; }

    [MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    /// <summary>Etiqueta que se muestra al lado del nombre: "Maestría", "Actualización profesional", "Cursos libres"...</summary>
    [MaxLength(60)]
    public string Tipo { get; set; } = "Maestría";

    /// <summary>
    /// true = un alumno puede estar inscrito en ella (sale en los selectores de
    /// carrera de los tres trámites). false = solo es un grupo de cursos sueltos
    /// que se toman al lado de una carrera real, como "Inglés" I–IV: sus cursos
    /// se pueden elegir como "curso adicional" pero nadie se inscribe en ella.
    /// </summary>
    public bool EsPrograma { get; set; } = true;

    /// <summary>
    /// Archivada. Deja de aparecer en los selectores sin borrar nada: los
    /// expedientes que ya la usan siguen siendo válidos. Es la salida cuando
    /// una carrera ya no se ofrece pero tiene alumnos con historial.
    /// </summary>
    public bool Activa { get; set; } = true;

    /// <summary>Orden de aparición en los listados (empate: alfabético).</summary>
    public int Orden { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
