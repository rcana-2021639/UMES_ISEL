using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace UmesIsel.Api.Security;

/// <summary>
/// Límites de peticiones.
///
/// Tres capas, cada una contra un abuso distinto:
///
/// · <see cref="Login"/> — las puertas de acceso. Muy estrecho: probar carnés,
///   correos o contraseñas a mano deja de ser viable. Es la defensa contra
///   fuerza bruta y contra el paseo por el padrón de alumnos.
/// · <see cref="Pesado"/> — lo que hace trabajar al servidor de verdad: generar
///   PDFs (arranca LibreOffice), exportar, importar, respaldar. Sin esto, una
///   sola pestaña pidiendo "imprimir todas" en bucle tumba el servidor sin
///   necesidad de un ataque real.
/// · Global — un techo general por dirección IP para todo lo demás.
///
/// La partición es por IP. Con un proxy delante hay que configurar
/// ForwardedHeaders (ver Program.cs) o todas las peticiones parecerán venir de
/// la misma dirección y se limitarían entre sí.
/// </summary>
public static class RateLimitPolicies
{
    public const string Login = "login";
    public const string Pesado = "pesado";

    public static void Configure(RateLimiterOptions options)
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        options.OnRejected = async (context, cancellationToken) =>
        {
            if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            {
                context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
            }
            context.HttpContext.Response.ContentType = "text/plain; charset=utf-8";
            await context.HttpContext.Response.WriteAsync(
                "Estás haciendo demasiadas peticiones seguidas. Espera un momento y vuelve a intentarlo.",
                cancellationToken);
        };

        // 10 intentos de acceso por IP cada 5 minutos. Una persona que se
        // equivoca de correo un par de veces no lo nota; un script que prueba
        // carnés correlativos se queda a las diez.
        options.AddPolicy(Login, ctx => RateLimitPartition.GetFixedWindowLimiter(
            ClientKey(ctx),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0,
            }));

        // 20 operaciones pesadas por minuto y como mucho 2 a la vez: generar un
        // PDF levanta un proceso de LibreOffice, y treinta en paralelo se comen
        // la memoria de la máquina.
        options.AddPolicy(Pesado, ctx => RateLimitPartition.GetConcurrencyLimiter(
            ClientKey(ctx),
            _ => new ConcurrencyLimiterOptions
            {
                PermitLimit = 2,
                QueueLimit = 6,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            }));

        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
            RateLimitPartition.GetTokenBucketLimiter(
                ClientKey(ctx),
                _ => new TokenBucketRateLimiterOptions
                {
                    // Deja pasar ráfagas legítimas (una pantalla del panel dispara
                    // varias llamadas a la vez) pero corta el goteo sostenido.
                    TokenLimit = 240,
                    TokensPerPeriod = 120,
                    ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                    AutoReplenishment = true,
                }));
    }

    private static string ClientKey(HttpContext ctx) =>
        ctx.Connection.RemoteIpAddress?.ToString() ?? "desconocida";
}
