using System.Security.Cryptography;

namespace UmesIsel.Api.Security;

/// <summary>
/// De dónde sale la clave con la que se firman los tokens de sesión.
///
/// Orden de preferencia:
///  1. <c>Security:TokenSecret</c> (variable de entorno <c>Security__TokenSecret</c>).
///     Es lo que hay que usar en producción, y lo único que funciona si algún día
///     corren dos instancias detrás de un balanceador.
///  2. Un archivo generado con el generador criptográfico del sistema en
///     <c>App_Data/keys/token-signing.key</c>, creado la primera vez que arranca.
///
/// El paso 2 existe para que **nunca se despliegue una clave predecible ni la
/// aplicación se caiga por falta de configuración**. La alternativa habitual
/// —"si no hay secreto, no arranco"— es más pura pero convierte el día del
/// despliegue en una carrera a ciegas; y la otra alternativa —un valor por
/// defecto en el código— es sencillamente una puerta abierta, porque estaría en
/// el repositorio. Un archivo con 32 bytes aleatorios fuera de git da la misma
/// seguridad que la variable de entorno mientras haya una sola instancia.
///
/// Borrar ese archivo cierra la sesión de todo el mundo: es el botón de pánico
/// si se sospecha que un token se filtró.
/// </summary>
public static class SigningKeyProvider
{
    private const int KeySizeBytes = 32;

    public static byte[] Resolve(IConfiguration config, string contentRootPath, ILogger logger)
    {
        var configured = config["Security:TokenSecret"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            if (configured.Trim().Length < 32)
            {
                throw new InvalidOperationException(
                    "Security:TokenSecret es demasiado corto: usa al menos 32 caracteres aleatorios " +
                    "(por ejemplo la salida de: openssl rand -base64 48).");
            }
            logger.LogInformation("Tokens de sesión firmados con la clave de la configuración (Security:TokenSecret).");
            return System.Text.Encoding.UTF8.GetBytes(configured.Trim());
        }

        var dir = Path.Combine(contentRootPath, "App_Data", "keys");
        var path = Path.Combine(dir, "token-signing.key");

        if (File.Exists(path))
        {
            var existing = File.ReadAllBytes(path);
            if (existing.Length >= KeySizeBytes)
            {
                logger.LogInformation("Tokens de sesión firmados con la clave local de {Path}.", path);
                return existing;
            }
            logger.LogWarning("La clave de firma en {Path} estaba incompleta; se regenera.", path);
        }

        Directory.CreateDirectory(dir);
        var key = RandomNumberGenerator.GetBytes(KeySizeBytes);
        File.WriteAllBytes(path, key);
        RestrictToOwner(path, logger);

        logger.LogWarning(
            "No hay Security:TokenSecret configurado. Se generó una clave de firma nueva en {Path}. " +
            "Para producción, define la variable de entorno Security__TokenSecret y respáldala junto con la base de datos.",
            path);
        return key;
    }

    /// <summary>
    /// En Linux/macOS deja el archivo en 600 (solo lo lee la cuenta que corre la
    /// aplicación). En Windows no se tocan las ACL desde aquí: hacerlo bien
    /// exige el paquete de ACL y permisos que el proceso puede no tener, y
    /// fallar a medias deja el archivo peor que como estaba — ahí la protección
    /// es la de la carpeta <c>App_Data</c>, que además está fuera de git y no la
    /// sirve el servidor web. Queda anotado en el README de despliegue.
    /// </summary>
    private static void RestrictToOwner(string path, ILogger logger)
    {
        if (OperatingSystem.IsWindows()) return;
        try
        {
            File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No se pudieron restringir los permisos de {Path}; revísalos a mano (chmod 600).", path);
        }
    }
}
