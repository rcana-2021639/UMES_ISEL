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
    string? Celular
);

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
