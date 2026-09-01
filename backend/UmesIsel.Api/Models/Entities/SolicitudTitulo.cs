using System.ComponentModel.DataAnnotations;

namespace UmesIsel.Api.Models.Entities;

/// <summary>
/// "Solicitud de Impresión de Título" — el FORMATO oficial de la universidad
/// (Resources/SolicitudTituloTemplate.docx), a nombre de un alumno que ya tiene carné.
///
/// A diferencia de <see cref="Applicant"/> (que es alguien de nuevo ingreso, todavía sin carné),
/// esta ficha SIEMPRE cuelga de un <see cref="Student"/> real: se entra con el carné, igual que al
/// portal de asignación, y de ahí salen ya llenos el carné, los nombres, los apellidos y la carrera.
/// Un alumno tiene como mucho una solicitud viva a la vez — volver a entrar con el mismo carné la
/// reanuda en vez de crear otra.
/// </summary>
public class SolicitudTitulo
{
    public int Id { get; set; }

    public int StudentId { get; set; }
    public Student? Student { get; set; }

    /// <summary>Copia del carné al momento de crearla — la ficha impresa no debe depender del padrón.</summary>
    [MaxLength(20)]
    public string Carnet { get; set; } = string.Empty;

    /// <summary>Una de las seis sedes del encabezado — ver <see cref="CampusSolicitud"/>.</summary>
    [MaxLength(30)]
    public string? Campus { get; set; }

    /// <summary>El día en que se generó la ficha (se sella al crearla, no al imprimirla).</summary>
    public DateOnly FechaSolicitud { get; set; }

    public bool ParticipaCeremonia { get; set; }

    /// <summary>Nombres tal como deben salir impresos, uno por casilla de la rejilla de 37.</summary>
    [MaxLength(120)]
    public string Nombres { get; set; } = string.Empty;

    /// <summary>Apellidos tal como deben salir impresos, uno por casilla de la rejilla de 37.</summary>
    [MaxLength(120)]
    public string Apellidos { get; set; } = string.Empty;

    public DateOnly? FechaNacimiento { get; set; }

    [MaxLength(40)]
    public string? EstadoCivil { get; set; }

    /// <summary>"F" o "M" — las dos casillas de la ficha.</summary>
    [MaxLength(1)]
    public string? Sexo { get; set; }

    [MaxLength(250)]
    public string? DireccionDomicilio { get; set; }

    [MaxLength(30)]
    public string? TelefonoDomicilio { get; set; }

    [MaxLength(30)]
    public string? TelefonoCelular { get; set; }

    [MaxLength(30)]
    public string? TelefonoEmergencia { get; set; }

    [MaxLength(150)]
    public string? CorreoElectronico { get; set; }

    [MaxLength(200)]
    public string? Empresa { get; set; }

    [MaxLength(150)]
    public string? Cargo { get; set; }

    [MaxLength(250)]
    public string? DireccionTrabajo { get; set; }

    [MaxLength(60)]
    public string? TelefonoTrabajo { get; set; }

    [MaxLength(200)]
    public string? FacultadDepartamento { get; set; }

    [MaxLength(250)]
    public string? TituloObtener { get; set; }

    /// <summary>
    /// La fotografía del recuadro "PEGAR FOTOGRAFÍA RECIENTE", como data URL. El frontend ya la
    /// entrega recortada a la proporción exacta del recuadro (ver SolicitudTituloPhoto.tsx), así que
    /// aquí se guarda tal cual y el builder solo la coloca.
    /// </summary>
    public string? FotoBase64 { get; set; }

    /// <summary>PNG de la firma capturada en el pad, como data URL — igual que en las otras fichas.</summary>
    public string? FirmaBase64 { get; set; }
    public DateTime? FirmadoEn { get; set; }

    /// <summary>Marcada por el admin cuando la solicitud ya se procesó (deja de salir en pendientes).</summary>
    public bool Entregada { get; set; }
    public DateTime? EntregadaEn { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Las seis sedes del encabezado del FORMATO, en el orden en que aparecen impresas.</summary>
public static class CampusSolicitud
{
    public const string Central = "Central";
    public const string Quetzaltenango = "Quetzaltenango";
    public const string CentroSalesiano = "CentroSalesiano";
    public const string AltaVerapaz = "AltaVerapaz";
    public const string Morales = "Morales";
    public const string Honduras = "Honduras";

    public static readonly string[] Todos =
    {
        Central, Quetzaltenango, CentroSalesiano, AltaVerapaz, Morales, Honduras,
    };

    public static bool EsValido(string? campus) => campus is not null && Todos.Contains(campus);
}
