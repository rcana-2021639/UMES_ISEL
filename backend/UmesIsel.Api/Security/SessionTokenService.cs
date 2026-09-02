using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace UmesIsel.Api.Security;

public enum SessionRole
{
    Admin,
    Student,
    Applicant,
}

/// <summary>Quién es el que está llamando, ya verificado. Lo rellena <see cref="SessionAuthenticationMiddleware"/>.</summary>
public sealed class CurrentUser
{
    public bool IsAuthenticated { get; private set; }
    public SessionRole Role { get; private set; }

    /// <summary>Id del alumno / aspirante / cuenta de admin, según el rol.</summary>
    public int SubjectId { get; private set; }

    /// <summary>Nombre para el registro de auditoría (carné, usuario…).</summary>
    public string Display { get; private set; } = string.Empty;

    public bool IsAdmin => IsAuthenticated && Role == SessionRole.Admin;
    public bool IsStudent => IsAuthenticated && Role == SessionRole.Student;
    public bool IsApplicant => IsAuthenticated && Role == SessionRole.Applicant;

    /// <summary>true si es admin, o si es este mismo sujeto. La comprobación anti-IDOR de todo el proyecto.</summary>
    public bool IsAdminOr(SessionRole role, int subjectId) =>
        IsAdmin || (IsAuthenticated && Role == role && SubjectId == subjectId);

    public void Set(SessionRole role, int subjectId, string display)
    {
        IsAuthenticated = true;
        Role = role;
        SubjectId = subjectId;
        Display = display;
    }
}

/// <summary>Lo que viaja firmado dentro del token. Nombres de un carácter: el token va en cada petición.</summary>
public sealed class SessionPayload
{
    [JsonPropertyName("r")] public string Role { get; set; } = string.Empty;
    [JsonPropertyName("i")] public int SubjectId { get; set; }
    [JsonPropertyName("d")] public string Display { get; set; } = string.Empty;
    [JsonPropertyName("e")] public long ExpiresAt { get; set; }
    [JsonPropertyName("n")] public string Nonce { get; set; } = string.Empty;
}

/// <summary>
/// Emite y valida los tokens de sesión.
///
/// Son tokens firmados (HMAC-SHA256) y sin estado: el servidor no guarda una
/// tabla de sesiones. Para esta aplicación es la decisión correcta —no hay que
/// mantener ni limpiar nada, y sobrevive a un reinicio— a cambio de que un token
/// robado valga hasta que caduque. Por eso las caducidades son cortas y la clave
/// de firma se puede rotar: cambiarla invalida todas las sesiones de golpe, que
/// es el botón de pánico si algo se filtra.
///
/// El token identifica al sujeto, NO a sus permisos: el rol se comprueba en cada
/// petición contra la base (ver <see cref="SessionAuthenticationMiddleware"/> y
/// los atributos de autorización). Así, desactivar una cuenta de admin surte
/// efecto de inmediato en vez de esperar a que caduque su token.
/// </summary>
public class SessionTokenService
{
    private readonly byte[] _key;
    private readonly TimeSpan _adminLifetime;
    private readonly TimeSpan _publicLifetime;

    private static readonly JsonSerializerOptions Json = new() { DefaultIgnoreCondition = JsonIgnoreCondition.Never };

    public SessionTokenService(byte[] signingKey, TimeSpan adminLifetime, TimeSpan publicLifetime)
    {
        _key = signingKey;
        _adminLifetime = adminLifetime;
        _publicLifetime = publicLifetime;
    }

    /// <summary>
    /// La sesión de admin dura menos que la del público a propósito: es la que
    /// puede borrar la base, y la que más veces se queda abierta en una
    /// computadora compartida de oficina.
    /// </summary>
    public TimeSpan LifetimeFor(SessionRole role) => role == SessionRole.Admin ? _adminLifetime : _publicLifetime;

    public (string Token, DateTimeOffset ExpiresAt) Issue(SessionRole role, int subjectId, string display)
    {
        var expires = DateTimeOffset.UtcNow.Add(LifetimeFor(role));
        var payload = new SessionPayload
        {
            Role = role.ToString().ToLowerInvariant(),
            SubjectId = subjectId,
            Display = display,
            ExpiresAt = expires.ToUnixTimeSeconds(),
            // Hace que dos tokens del mismo sujeto emitidos en el mismo segundo
            // no sean idénticos; sin esto, el token es una función determinista
            // de datos que un tercero puede conocer.
            Nonce = Base64Url(RandomNumberGenerator.GetBytes(9)),
        };

        var body = Base64Url(JsonSerializer.SerializeToUtf8Bytes(payload, Json));
        return ($"{body}.{Sign(body)}", expires);
    }

    /// <summary>Devuelve el contenido del token si la firma es válida y no ha caducado; null en cualquier otro caso.</summary>
    public SessionPayload? Validate(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        var dot = token.IndexOf('.');
        if (dot <= 0 || dot == token.Length - 1) return null;

        var body = token[..dot];
        var signature = token[(dot + 1)..];

        // Firma primero, contenido después: no se deserializa nada que no venga
        // ya probado como emitido por nosotros.
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(signature), Encoding.ASCII.GetBytes(Sign(body))))
        {
            return null;
        }

        SessionPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<SessionPayload>(FromBase64Url(body), Json);
        }
        catch (Exception e) when (e is JsonException or FormatException)
        {
            return null;
        }

        if (payload is null) return null;
        if (DateTimeOffset.FromUnixTimeSeconds(payload.ExpiresAt) <= DateTimeOffset.UtcNow) return null;

        return payload;
    }

    public static SessionRole? ParseRole(string? role) => role switch
    {
        "admin" => SessionRole.Admin,
        "student" => SessionRole.Student,
        "applicant" => SessionRole.Applicant,
        _ => null,
    };

    private string Sign(string body)
    {
        using var hmac = new HMACSHA256(_key);
        return Base64Url(hmac.ComputeHash(Encoding.UTF8.GetBytes(body)));
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string value)
    {
        var s = value.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(s.PadRight(s.Length + (4 - s.Length % 4) % 4, '='));
    }
}
