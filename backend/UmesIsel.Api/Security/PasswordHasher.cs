using System.Security.Cryptography;

namespace UmesIsel.Api.Security;

/// <summary>
/// Hash de contraseñas para las cuentas de administrador.
///
/// PBKDF2-HMAC-SHA256 con 210 000 iteraciones (la cifra que recomienda OWASP
/// para PBKDF2-SHA256) y una sal aleatoria de 16 bytes por contraseña. Va con
/// las primitivas de .NET a propósito: no añade dependencias, está en modo FIPS
/// y no hay forma de usarlo mal por accidente.
///
/// El formato guardado es autodescriptivo — <c>pbkdf2.sha256.{iteraciones}.{sal}.{hash}</c> —
/// para poder subir el número de iteraciones en el futuro y seguir validando las
/// contraseñas viejas sin obligar a nadie a cambiarla.
/// </summary>
public static class PasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 210_000;
    private const char Separator = '.';

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
        return string.Join(Separator, "pbkdf2", "sha256", Iterations, Convert.ToBase64String(salt), Convert.ToBase64String(key));
    }

    /// <summary>
    /// Comprueba una contraseña contra su hash. Nunca lanza: un hash corrupto o
    /// de un formato que no reconoce es simplemente "no coincide", porque el
    /// sitio donde se llama es el login y ahí una excepción sería una forma de
    /// distinguir cuentas.
    /// </summary>
    public static bool Verify(string password, string? stored)
    {
        if (string.IsNullOrWhiteSpace(stored)) return false;

        var parts = stored.Split(Separator);
        if (parts.Length != 5 || parts[0] != "pbkdf2" || parts[1] != "sha256") return false;
        if (!int.TryParse(parts[2], out var iterations) || iterations < 1000) return false;

        byte[] salt, expected;
        try
        {
            salt = Convert.FromBase64String(parts[3]);
            expected = Convert.FromBase64String(parts[4]);
        }
        catch (FormatException)
        {
            return false;
        }

        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);
        // Comparación en tiempo constante: comparar con == filtraría, por el
        // tiempo de respuesta, cuántos bytes del hash se acertaron.
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    /// <summary>
    /// Contraseña inicial legible pero no adivinable, para cuando hay que crear
    /// la primera cuenta de admin sin que nadie la haya elegido. Alfabeto sin
    /// caracteres que se confundan al dictarla por teléfono (0/O, 1/l/I).
    /// </summary>
    public static string GenerateReadablePassword(int length = 20)
    {
        const string alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return RandomNumberGenerator.GetString(alphabet, length);
    }

    /// <summary>
    /// Política mínima. Devuelve el motivo del rechazo, o null si pasa.
    /// Longitud por encima de todo: es lo único que de verdad importa en una
    /// contraseña, y exigir símbolos raros solo consigue "Password1!" y un
    /// papelito pegado al monitor.
    /// </summary>
    public static string? ValidatePolicy(string? password)
    {
        if (string.IsNullOrWhiteSpace(password)) return "La contraseña es obligatoria.";
        if (password.Length < 12) return "La contraseña debe tener al menos 12 caracteres.";
        if (password.Length > 200) return "La contraseña no puede pasar de 200 caracteres.";
        if (password.Trim().Length != password.Length) return "La contraseña no puede empezar ni terminar con espacios.";

        var comunes = new[] { "password", "contrasena", "contraseña", "12345678", "qwerty", "admin", "isel", "umes" };
        var lower = password.ToLowerInvariant();
        if (comunes.Any(c => lower.Contains(c)))
        {
            return "Esa contraseña es demasiado fácil de adivinar: no uses palabras como «admin», «umes», «isel» o «password».";
        }
        return null;
    }
}
