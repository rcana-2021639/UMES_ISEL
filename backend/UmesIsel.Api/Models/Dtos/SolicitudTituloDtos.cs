namespace UmesIsel.Api.Models.Dtos;

/// <summary>POST /api/solicitudes-titulo/acceso — solo el carné, sin contraseña (igual que el portal de asignación).</summary>
/// <summary>
/// Acceso a la solicitud de título: carné MÁS correo institucional, igual que el
/// portal del alumno. Antes bastaba el carné, y esta ficha lleva fotografía y
/// firma digitalizadas — de lo más sensible que guarda la aplicación.
/// </summary>
public record SolicitudTituloAccesoRequest(string Carnet, string? CorreoInstitucional);

/// <summary>La solicitud y la llave de sesión para poder seguir editándola.</summary>
public record SolicitudTituloAccesoResponse(SolicitudTituloDto Solicitud, string Token, DateTimeOffset ExpiresAt);

/// <summary>La solicitud completa — lo que el formulario carga para reanudar y lo que el admin ve.</summary>
public record SolicitudTituloDto(
    int Id,
    int StudentId,
    string Carnet,
    string NombreCompletoAlumno,
    string CarreraAlumno,
    string? Campus,
    DateOnly FechaSolicitud,
    bool ParticipaCeremonia,
    string Nombres,
    string Apellidos,
    DateOnly? FechaNacimiento,
    string? EstadoCivil,
    string? Sexo,
    string? DireccionDomicilio,
    string? TelefonoDomicilio,
    string? TelefonoCelular,
    string? TelefonoEmergencia,
    string? CorreoElectronico,
    string? Empresa,
    string? Cargo,
    string? DireccionTrabajo,
    string? TelefonoTrabajo,
    string? FacultadDepartamento,
    string? TituloObtener,
    string? FotoBase64,
    string? FirmaBase64,
    DateTime? FirmadoEn,
    bool Entregada,
    DateTime? EntregadaEn,
    DateTime UpdatedAt
);

/// <summary>PUT /api/solicitudes-titulo/{id} — mismo cuerpo salvo lo que calcula el servidor.</summary>
public record SolicitudTituloUpsertRequest(
    string? Campus,
    bool ParticipaCeremonia,
    string Nombres,
    string Apellidos,
    DateOnly? FechaNacimiento,
    string? EstadoCivil,
    string? Sexo,
    string? DireccionDomicilio,
    string? TelefonoDomicilio,
    string? TelefonoCelular,
    string? TelefonoEmergencia,
    string? CorreoElectronico,
    string? Empresa,
    string? Cargo,
    string? DireccionTrabajo,
    string? TelefonoTrabajo,
    string? FacultadDepartamento,
    string? TituloObtener,
    string? FotoBase64,
    string? FirmaBase64
);

/// <summary>Fila liviana de la tabla del panel de admin — sin la foto ni la firma, que pesan.</summary>
public record SolicitudTituloListItemDto(
    int Id,
    string Carnet,
    string NombreCompletoAlumno,
    string CarreraAlumno,
    string? Campus,
    DateOnly FechaSolicitud,
    bool ParticipaCeremonia,
    bool TieneFoto,
    bool TieneFirma,
    bool Completa,
    bool Entregada
);

/// <summary>PATCH /api/solicitudes-titulo/{id}/entregada — el admin la marca como ya procesada.</summary>
public record MarcarEntregadaRequest(bool Entregada);
