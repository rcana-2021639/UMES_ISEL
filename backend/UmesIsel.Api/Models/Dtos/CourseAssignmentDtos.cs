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
    string? TipoPago,
    string? FirmaBase64,
    DateTime? FirmadoEn,
    string? AutorizadoPorCodigo,
    DateTime UpdatedAt,
    // Con valor por defecto: la ficha de asignación del wizard de Inscripción reutiliza este DTO
    // para dibujar el mismo formato impreso, y un aspirante no tiene marca de impresión que dar.
    DateTime? ImpresaEn = null,
    string? ImpresaPor = null,
    DateTime? CorreoEnviadoEn = null
);

/// <summary>Cuerpo de PUT /{id}/impresa — para desmarcar una ficha cuando la impresión no salió.</summary>
public record MarcarImpresaRequest(bool Impresa);

/// <summary>Cuerpo de PUT /{id}/correo-enviado — marca o desmarca que ya se pidió el link de pago.</summary>
public record MarcarCorreoEnviadoRequest(bool Enviado);

/// <summary>Body the student (or admin) submits to save a ficha. Grids are replaced wholesale on each save.</summary>
public record CourseAssignmentUpsertRequest(
    string Carnet,
    string Carrera,
    int Trimestre,
    string? Seccion,
    IReadOnlyList<AssignedCourseRowDto> CursosAsignados,
    IReadOnlyList<AdditionalCourseRowDto> CursosAdicionales,
    bool TienePendientesTrimestres,
    bool TienePendientesMaterias,
    string? CorreoContacto,
    string? TelefonoContacto,
    string? TipoPago,
    string? FirmaBase64,
    string? AutorizadoPorCodigo,
    /// <summary>
    /// La ficha que se está EDITANDO, si es una ya guardada. Con él, cambiar la maestría o el
    /// trimestre corrige esa misma ficha; sin él (una ficha nueva) se busca por alumno + maestría +
    /// trimestre como siempre. Antes no había forma de distinguir "corrijo esta" de "creo otra", y
    /// corregir la maestría de una ficha ya impresa dejaba la equivocada guardada al lado de la nueva.
    /// </summary>
    int? Id = null
);

// ---- Reinicio de asignaciones / archivo de fichas ----

public record ArchivoFichasDto(
    int Id, string Etiqueta, string Estado, int CantidadFichas, long Bytes, string? Error,
    string CreadoPor, DateTime CreadoEn, DateTime? TerminadoEn, bool Disponible);

public record ResumenReinicioDto(int TotalFichas, int Impresas, int Pendientes, bool EnCurso);

public record ReiniciarAsignacionesRequest(string? Etiqueta, string? Confirmacion);
