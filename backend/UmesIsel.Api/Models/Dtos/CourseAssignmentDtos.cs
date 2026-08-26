namespace UmesIsel.Api.Models.Dtos;

public record AssignedCourseRowDto(int Numero, string Curso, string? SemTri, string? Seccion);

public record AdditionalCourseRowDto(
    int Numero,
    string CursoAdicional,
    string? Carrera,
    string? SemTri,
    string? Seccion,
    string? Jornada
);

/// <summary>Full "Ficha de Asignación de Cursos" — student header + both grids + signature.</summary>
public record CourseAssignmentDto(
    int Id,
    int StudentId,
    string Carnet,
    string NombreCompleto,
    string PrimerApellido,
    string? SegundoApellido,
    string PrimerNombre,
    string? SegundoNombre,
    DateOnly Fecha,
    int Trimestre,
    string Carrera,
    string? Seccion,
    IReadOnlyList<AssignedCourseRowDto> CursosAsignados,
    IReadOnlyList<AdditionalCourseRowDto> CursosAdicionales,
    bool TienePendientesTrimestres,
    bool TienePendientesMaterias,
    string? CorreoContacto,
    string? TelefonoContacto,
    string? ComprobantePagoNo,
    string? TipoPago,
    string? FirmaBase64,
    DateTime? FirmadoEn,
    string? AutorizadoPorCodigo,
    DateTime UpdatedAt
);

/// <summary>Body the student (or admin) submits to save a ficha. Grids are replaced wholesale on each save.</summary>
public record CourseAssignmentUpsertRequest(
    string Carnet,
    int Trimestre,
    IReadOnlyList<AssignedCourseRowDto> CursosAsignados,
    IReadOnlyList<AdditionalCourseRowDto> CursosAdicionales,
    bool TienePendientesTrimestres,
    bool TienePendientesMaterias,
    string? CorreoContacto,
    string? TelefonoContacto,
    string? ComprobantePagoNo,
    string? TipoPago,
    string? FirmaBase64,
    string? AutorizadoPorCodigo
);
