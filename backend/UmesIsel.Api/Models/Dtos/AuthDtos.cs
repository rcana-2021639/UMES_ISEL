namespace UmesIsel.Api.Models.Dtos;

/// <summary>
/// Acceso de un alumno: su carné MÁS su correo institucional.
///
/// Antes bastaba el carné. Como los carnés son correlativos (2026101500,
/// 2026101501…), eso significaba que cualquiera podía entrar como cualquier
/// alumno y firmar su ficha sin más que contar hacia arriba. Pedir además el
/// correo institucional no es una contraseña —no es secreto— pero obliga a
/// conocer a la persona en vez de adivinar un número, y combinado con el límite
/// de intentos cierra el paseo por el padrón.
/// </summary>
public record StudentLoginRequest(string Carnet, string CorreoInstitucional);

/// <summary>Acceso al panel: cuenta nombrada y contraseña. Ver <see cref="Entities.AdminUser"/>.</summary>
public record AdminLoginRequest(string Username, string Password);

/// <summary>
/// Lo que se devuelve al entrar. <paramref name="Token"/> es la sesión firmada
/// que el navegador reenvía en <c>Authorization: Bearer</c>; caduca sola.
/// </summary>
public record LoginResponse(
    string Role,
    string Token,
    DateTimeOffset ExpiresAt,
    StudentDto? Student,
    AdminUserDto? Admin
);

public record AdminUserDto(
    int Id,
    string Username,
    string NombreCompleto,
    bool Activo,
    bool DebeCambiarPassword,
    DateTime? UltimoAcceso
);

public record AdminUserCreateRequest(string Username, string NombreCompleto, string? Password);
public record AdminUserUpdateRequest(string NombreCompleto, bool Activo);
public record CambiarPasswordRequest(string PasswordActual, string PasswordNueva);
public record ResetPasswordResponse(string PasswordTemporal);

public record SecurityEventDto(
    int Id,
    DateTime OcurridoEn,
    string Tipo,
    string Actor,
    string? Ip,
    string? Detalle,
    bool EsAlerta
);
