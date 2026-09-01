namespace UmesIsel.Api.Models.Dtos;

/// <summary>POST /api/inscripciones/acceso — DPI o pasaporte, sin contraseña; crea el aspirante si no existía.</summary>
public record InscripcionAccesoRequest(string? Dpi, string? Pasaporte);

public record PreinscripcionDto(
    string NombreCompleto,
    string? Dpi,
    string? NoPasaporte,
    string Carrera,
    string? Jornada,
    DateOnly? FechaNacimiento,
    string? Genero,
    string? LugarNacimiento,
    string? Nacionalidad,
    string? DireccionCompleta,
    string? Departamento,
    string? Municipio,
    string? EstadoCivil,
    string? ComunidadLinguistica,
    string? PuebloPertenencia,
    string? IdiomaMaterno,
    string? CorreoElectronico,
    string? TelefonoCelular,
    string? TelefonoCasa,
    string? Emergencia1Nombre,
    string? Emergencia1Telefono,
    string? Emergencia2Nombre,
    string? Emergencia2Telefono,
    bool TieneAlergia,
    string? AlergiaDescripcion,
    bool TieneProblemaSalud,
    string? SaludDescripcion,
    string? FirmaBase64,
    DateTime? FirmadoEn
);

/// <summary>Mismo cuerpo que <see cref="PreinscripcionDto"/> salvo el sello de firma (se calcula al guardar).</summary>
public record PreinscripcionUpsertRequest(
    string NombreCompleto,
    string? Dpi,
    string? NoPasaporte,
    string Carrera,
    string? Jornada,
    DateOnly? FechaNacimiento,
    string? Genero,
    string? LugarNacimiento,
    string? Nacionalidad,
    string? DireccionCompleta,
    string? Departamento,
    string? Municipio,
    string? EstadoCivil,
    string? ComunidadLinguistica,
    string? PuebloPertenencia,
    string? IdiomaMaterno,
    string? CorreoElectronico,
    string? TelefonoCelular,
    string? TelefonoCasa,
    string? Emergencia1Nombre,
    string? Emergencia1Telefono,
    string? Emergencia2Nombre,
    string? Emergencia2Telefono,
    bool TieneAlergia,
    string? AlergiaDescripcion,
    bool TieneProblemaSalud,
    string? SaludDescripcion,
    string? FirmaBase64
);

public record AsignacionNuevoIngresoDto(
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
    DateTime? FirmadoEn
);

public record AsignacionNuevoIngresoUpsertRequest(
    string PrimerApellido,
    string? SegundoApellido,
    string PrimerNombre,
    string? SegundoNombre,
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
    string? FirmaBase64
);

public record CartaCompromisoDto(
    DateOnly Fecha,
    string Carrera,
    bool EsExtranjero,
    string NombreCompleto,
    string NoDpi,
    string? FirmaBase64,
    DateTime? FirmadoEn
);

public record CartaCompromisoUpsertRequest(
    string Carrera,
    bool EsExtranjero,
    string NombreCompleto,
    string NoDpi,
    string? FirmaBase64
);

public record ApplicantDocumentDto(string Tipo, string FileName, long SizeBytes, DateTime UploadedAt);

/// <summary>Bundle completo de un aspirante — lo que el wizard usa para reanudar y lo que el admin ve en "Ver fichas".</summary>
public record ApplicantDto(
    int Id,
    string? Dpi,
    string? Pasaporte,
    string? PrimerApellido,
    string? SegundoApellido,
    string? PrimerNombre,
    string? SegundoNombre,
    string? NombreCompleto,
    bool EsExtranjero,
    int? MigradoStudentId,
    DateTime? MigradoEn,
    DateTime UpdatedAt,
    PreinscripcionDto? Preinscripcion,
    AsignacionNuevoIngresoDto? Asignacion,
    CartaCompromisoDto? Compromiso,
    IReadOnlyList<ApplicantDocumentDto> Documentos
);

/// <summary>Fila liviana para la tabla del panel admin — sin anidar las 3 fichas completas.</summary>
public record ApplicantListItemDto(
    int Id,
    string? Dpi,
    string? Pasaporte,
    string NombreCompleto,
    string? Carrera,
    string? Seccion,
    int? Trimestre,
    bool EsExtranjero,
    bool Migrado,
    bool FichaCompleta,
    int DocumentosSubidos,
    int DocumentosRequeridos,
    DateOnly Fecha
);

/// <summary>POST /api/inscripciones/{id}/migrar — el carné/sección que solo el otro departamento puede dar.</summary>
public record MigrarAspiranteRequest(string Carnet, string? Seccion, int? Trimestre);
