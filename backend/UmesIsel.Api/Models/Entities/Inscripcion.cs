using System.ComponentModel.DataAnnotations;
using System.Linq;

namespace UmesIsel.Api.Models.Entities;

/// <summary>
/// Un aspirante de nuevo ingreso — todavía sin carné ni sección, así que vive
/// separado de <see cref="Student"/> hasta que se lo migra (ver
/// <see cref="MigradoStudentId"/>). Se identifica por <see cref="Dpi"/> o, si es
/// extranjero y no tiene, por <see cref="Pasaporte"/> — sin contraseña, igual que
/// el ingreso por carné del portal ya existente.
/// </summary>
public class Applicant
{
    public int Id { get; set; }

    [MaxLength(20)]
    public string? Dpi { get; set; }

    [MaxLength(30)]
    public string? Pasaporte { get; set; }

    [MaxLength(120)]
    public string? PrimerApellido { get; set; }

    [MaxLength(120)]
    public string? SegundoApellido { get; set; }

    [MaxLength(120)]
    public string? PrimerNombre { get; set; }

    [MaxLength(120)]
    public string? SegundoNombre { get; set; }

    /// <summary>Denormalizado "Apellidos, Nombres", igual que en <see cref="Student"/>, mantenido en cada guardado.</summary>
    [MaxLength(250)]
    public string? NombreCompleto { get; set; }

    public bool EsExtranjero { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Si ya se migró a la base de datos de alumnos (botón "Agregar a la base de datos").</summary>
    public int? MigradoStudentId { get; set; }
    public Student? MigradoStudent { get; set; }
    public DateTime? MigradoEn { get; set; }

    public Preinscripcion? Preinscripcion { get; set; }
    public AsignacionNuevoIngreso? AsignacionNuevoIngreso { get; set; }
    public CartaCompromiso? CartaCompromiso { get; set; }
    public List<ApplicantDocument> Documentos { get; set; } = new();
}

/// <summary>
/// "Ficha de Preinscripción para Nuevo Ingreso" — mirrors
/// Resources/PreinscripcionTemplate.xlsx field for field.
/// </summary>
public class Preinscripcion
{
    public int Id { get; set; }

    public int ApplicantId { get; set; }
    public Applicant? Applicant { get; set; }

    [MaxLength(250)]
    public string NombreCompleto { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Dpi { get; set; }

    [MaxLength(30)]
    public string? NoPasaporte { get; set; }

    [MaxLength(200)]
    public string Carrera { get; set; } = string.Empty;

    [MaxLength(60)]
    public string? Jornada { get; set; }

    public DateOnly? FechaNacimiento { get; set; }

    [MaxLength(30)]
    public string? Genero { get; set; }

    [MaxLength(150)]
    public string? LugarNacimiento { get; set; }

    [MaxLength(80)]
    public string? Nacionalidad { get; set; }

    [MaxLength(250)]
    public string? DireccionCompleta { get; set; }

    [MaxLength(100)]
    public string? Departamento { get; set; }

    [MaxLength(100)]
    public string? Municipio { get; set; }

    [MaxLength(40)]
    public string? EstadoCivil { get; set; }

    [MaxLength(80)]
    public string? ComunidadLinguistica { get; set; }

    /// <summary>Uno de: Maya, Garifuna, Extranjero, Xinka, Ladino, Afroascendiente.</summary>
    [MaxLength(30)]
    public string? PuebloPertenencia { get; set; }

    [MaxLength(80)]
    public string? IdiomaMaterno { get; set; }

    [MaxLength(150)]
    public string? CorreoElectronico { get; set; }

    [MaxLength(30)]
    public string? TelefonoCelular { get; set; }

    [MaxLength(30)]
    public string? TelefonoCasa { get; set; }

    [MaxLength(150)]
    public string? Emergencia1Nombre { get; set; }

    [MaxLength(30)]
    public string? Emergencia1Telefono { get; set; }

    [MaxLength(150)]
    public string? Emergencia2Nombre { get; set; }

    [MaxLength(30)]
    public string? Emergencia2Telefono { get; set; }

    public bool TieneAlergia { get; set; }

    [MaxLength(250)]
    public string? AlergiaDescripcion { get; set; }

    public bool TieneProblemaSalud { get; set; }

    [MaxLength(250)]
    public string? SaludDescripcion { get; set; }

    public string? FirmaBase64 { get; set; }
    public DateTime? FirmadoEn { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// La misma "Ficha de Asignación de Cursos" que ya usa <see cref="CourseAssignment"/>
/// (mismo Resources/FichaTemplate.xlsx impreso), pero para un aspirante sin carné —
/// los datos del encabezado se teclean a mano en vez de venir del padrón.
/// </summary>
public class AsignacionNuevoIngreso
{
    public int Id { get; set; }

    public int ApplicantId { get; set; }
    public Applicant? Applicant { get; set; }

    [MaxLength(120)]
    public string PrimerApellido { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? SegundoApellido { get; set; }

    [MaxLength(120)]
    public string PrimerNombre { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? SegundoNombre { get; set; }

    public DateOnly Fecha { get; set; }
    public int Trimestre { get; set; }

    [MaxLength(200)]
    public string Carrera { get; set; } = string.Empty;

    [MaxLength(10)]
    public string? Seccion { get; set; }

    public bool TienePendientesTrimestres { get; set; }
    public bool TienePendientesMaterias { get; set; }

    [MaxLength(150)]
    public string? CorreoContacto { get; set; }

    [MaxLength(30)]
    public string? TelefonoContacto { get; set; }

    /// <summary>
    /// "Link" o "Presencial", igual que en <see cref="CourseAssignment.TipoPago"/>: la
    /// ficha de asignación de un aspirante pregunta lo mismo que la de un alumno ya
    /// inscrito, y el valor viaja tal cual al migrarlo. Nunca se imprime en la ficha.
    /// </summary>
    [MaxLength(20)]
    public string? TipoPago { get; set; }

    public string? FirmaBase64 { get; set; }
    public DateTime? FirmadoEn { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<AsignacionNuevoIngresoCursoRow> CursosAsignados { get; set; } = new();
    public List<AsignacionNuevoIngresoAdicionalRow> CursosAdicionales { get; set; } = new();
}

/// <summary>Fila de "Cursos por asignarse" — misma forma que <see cref="AssignedCourseRow"/>.</summary>
public class AsignacionNuevoIngresoCursoRow
{
    public int Id { get; set; }
    public int AsignacionNuevoIngresoId { get; set; }
    public AsignacionNuevoIngreso? AsignacionNuevoIngreso { get; set; }

    public int Numero { get; set; }

    [MaxLength(200)]
    public string Curso { get; set; } = string.Empty;

    [MaxLength(10)]
    public string? SemTri { get; set; }

    [MaxLength(10)]
    public string? Seccion { get; set; }
}

/// <summary>Fila de "Cursos adicionales o cambio de sección" — misma forma que <see cref="AdditionalCourseRow"/>.</summary>
public class AsignacionNuevoIngresoAdicionalRow
{
    public int Id { get; set; }
    public int AsignacionNuevoIngresoId { get; set; }
    public AsignacionNuevoIngreso? AsignacionNuevoIngreso { get; set; }

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

/// <summary>
/// "Carta de compromiso" — la lista de documentos en sí no son datos (viven como
/// <see cref="ApplicantDocument"/>), esto es solo lo que la carta declara y firma.
/// </summary>
public class CartaCompromiso
{
    public int Id { get; set; }

    public int ApplicantId { get; set; }
    public Applicant? Applicant { get; set; }

    public DateOnly Fecha { get; set; }

    [MaxLength(200)]
    public string Carrera { get; set; } = string.Empty;

    public bool EsExtranjero { get; set; }

    [MaxLength(250)]
    public string NombreCompleto { get; set; } = string.Empty;

    [MaxLength(20)]
    public string NoDpi { get; set; } = string.Empty;

    public string? FirmaBase64 { get; set; }
    public DateTime? FirmadoEn { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Claves de documento reconocidas por ambos checklists (carta de compromiso de un
/// aspirante y "papelería al día" de un alumno ya asignado) — ver
/// <see cref="ApplicantDocument"/>/<see cref="StudentDocument"/>.
/// </summary>
public static class DocumentoTipos
{
    public const string DpiAutenticado = "DpiAutenticado";
    public const string Fotos = "Fotos";
    public const string TituloMedio = "TituloMedio";
    public const string TituloLicenciatura = "TituloLicenciatura";

    // Solo aplican si es extranjero.
    public const string PasaporteCompleto = "PasaporteCompleto";
    public const string FotosExtranjero = "FotosExtranjero";
    public const string TituloMedioExtranjero = "TituloMedioExtranjero";
    public const string TituloPregrado = "TituloPregrado";

    public static readonly string[] Nacional = { DpiAutenticado, Fotos, TituloMedio, TituloLicenciatura };
    public static readonly string[] Extranjero = { PasaporteCompleto, FotosExtranjero, TituloMedioExtranjero, TituloPregrado };

    public static string[] Requeridos(bool esExtranjero) => esExtranjero ? Nacional.Concat(Extranjero).ToArray() : Nacional;
}

/// <summary>Un documento en PDF subido por un aspirante para su carta de compromiso.</summary>
public class ApplicantDocument
{
    public int Id { get; set; }

    public int ApplicantId { get; set; }
    public Applicant? Applicant { get; set; }

    [MaxLength(40)]
    public string Tipo { get; set; } = string.Empty;

    [MaxLength(400)]
    public string FilePath { get; set; } = string.Empty;

    [MaxLength(260)]
    public string FileName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ContentType { get; set; } = "application/pdf";

    public long SizeBytes { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// El mismo checklist opcional de la carta de compromiso, pero para un alumno que
/// ya está asignado ("¿tiene su papelería al día?" — ver el panel de admin).
/// </summary>
public class StudentDocument
{
    public int Id { get; set; }

    public int StudentId { get; set; }
    public Student? Student { get; set; }

    [MaxLength(40)]
    public string Tipo { get; set; } = string.Empty;

    [MaxLength(400)]
    public string FilePath { get; set; } = string.Empty;

    [MaxLength(260)]
    public string FileName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ContentType { get; set; } = "application/pdf";

    public long SizeBytes { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
