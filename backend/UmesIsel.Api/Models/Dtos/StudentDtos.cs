namespace UmesIsel.Api.Models.Dtos;

/// <summary>Shape returned by the API for a student (list, detail, "who am I" after login).</summary>
public record StudentDto(
    int Id,
    string Carnet,
    string PrimerApellido,
    string? SegundoApellido,
    string PrimerNombre,
    string? SegundoNombre,
    string NombreCompleto,
    string Carrera,
    string? Seccion,
    int? Trimestre,
    string? CorreoInstitucional,
    string? CorreoPersonal,
    string? Celular,
    bool PapeleriaEnOrden,
    int DocumentosSubidos,
    /// <summary>
    /// Id del expediente de inscripción del que salió este alumno, o null si lo dio de alta a mano
    /// un administrador. Es lo que permite volver a abrir su preinscripción, su carta de compromiso
    /// y los documentos que subió, que al migrar dejan de aparecer en el listado de inscripciones.
    /// </summary>
    int? ExpedienteInscripcionId
);

/// <summary>PUT /api/students/{id}/papeleria-en-orden — respuesta a "¿Tiene su papelería al día?".</summary>
public record PapeleriaEnOrdenRequest(bool EnOrden);

/// <summary>Body for creating/editing a student — every field the admin's "Agregar alumno" form collects.</summary>
public record StudentUpsertRequest(
    string Carnet,
    string PrimerApellido,
    string? SegundoApellido,
    string PrimerNombre,
    string? SegundoNombre,
    string Carrera,
    string? Seccion,
    int? Trimestre,
    string? CorreoInstitucional,
    string? CorreoPersonal,
    string? Celular
);
