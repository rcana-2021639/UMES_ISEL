namespace UmesIsel.Api.Security;

/// <summary>
/// Cabeceras de seguridad en todas las respuestas.
///
/// Esta API devuelve JSON y archivos (PDF, .xlsx, .zip), no páginas HTML, así
/// que las cabeceras que más pesan aquí no son las mismas que en un sitio web
/// normal:
///
/// · <c>X-Content-Type-Options: nosniff</c> es la importante. Sin ella, el
///   navegador puede ignorar el Content-Type y "adivinar" el tipo de un archivo
///   subido; un PDF que en realidad es HTML con &lt;script&gt; se ejecutaría en
///   el dominio de la aplicación al abrirlo. Esta cabecera cierra esa puerta.
/// · <c>Content-Security-Policy: default-src 'none'</c> — nada de lo que sirve
///   esta API debe cargar recursos ni ejecutar scripts. Si algún día una
///   respuesta acabara interpretándose como HTML, no podría hacer nada.
/// · <c>X-Frame-Options</c> y <c>frame-ancestors</c> — que nadie meta esto en un
///   iframe para montar un clickjacking sobre el panel.
/// · <c>Referrer-Policy</c> — que la URL de la API no viaje a sitios de terceros.
/// · <c>Permissions-Policy</c> — apaga cámara, micrófono y geolocalización a
///   nivel de respuesta de la API (la cámara real de la foto del título vive en
///   el frontend, que es otro origen y tiene su propia política).
/// · <c>Strict-Transport-Security</c> solo cuando la petición ya vino por HTTPS:
///   mandarla por HTTP no sirve de nada y en desarrollo dejaría el navegador
///   forzando https://localhost durante meses.
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly bool _isDevelopment;

    public SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment env)
    {
        _next = next;
        _isDevelopment = env.IsDevelopment();
    }

    public Task InvokeAsync(HttpContext context)
    {
        // Se registran antes de escribir el cuerpo: una vez empezada la respuesta
        // ya no se pueden añadir cabeceras.
        context.Response.OnStarting(() =>
        {
            var h = context.Response.Headers;

            h["X-Content-Type-Options"] = "nosniff";
            h["X-Frame-Options"] = "DENY";
            h["Referrer-Policy"] = "no-referrer";
            h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), interest-cohort=()";
            h["Cross-Origin-Resource-Policy"] = "same-site";

            // Swagger es la única respuesta HTML que sirve esta API, y solo en
            // desarrollo: necesita cargar su propio CSS y JS, así que no puede ir
            // bajo 'none'. En producción Swagger no se publica y la política
            // estricta aplica a todo.
            var esSwagger = context.Request.Path.StartsWithSegments("/swagger");
            h["Content-Security-Policy"] = _isDevelopment && esSwagger
                ? "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'"
                : "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

            if (context.Request.IsHttps)
            {
                // 1 año, subdominios incluidos. Sin `preload`: eso es una lista
                // global de la que cuesta salir, y hay que pedirlo a conciencia.
                h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
            }

            // Nada de lo que devuelve esta API debe quedar cacheado en un proxy
            // compartido: son datos personales de alumnos.
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                h["Cache-Control"] = "no-store, no-cache, must-revalidate";
                h["Pragma"] = "no-cache";
            }

            // Kestrel anuncia su versión en cada respuesta; es información
            // gratuita para quien busca exploits de una versión concreta.
            h.Remove("Server");
            h.Remove("X-Powered-By");

            return Task.CompletedTask;
        });

        return _next(context);
    }
}
