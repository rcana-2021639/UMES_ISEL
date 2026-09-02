namespace UmesIsel.Api.Security;

/// <summary>
/// Convierte cualquier excepción no controlada en una respuesta corta y sin
/// detalles internos.
///
/// Por defecto, una excepción en producción devuelve una página de error y, si
/// alguien deja el modo de desarrollo puesto, la traza completa: rutas absolutas
/// del servidor, nombres de tablas, versiones de paquetes y a veces trozos de la
/// consulta SQL con datos dentro. Eso es un mapa del sistema regalado a quien
/// esté probando entradas raras.
///
/// Aquí el cliente recibe siempre lo mismo —un mensaje genérico y un
/// identificador— y la traza real va al log del servidor asociada a ese mismo
/// identificador. Cuando alguien reporte "me salió un error", ese código lleva
/// directo a la excepción exacta sin haberle enseñado nada a nadie.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            // El identificador de traza de ASP.NET ya aparece en el log; se
            // reutiliza en vez de inventar otro número que no correlacione.
            var referencia = context.TraceIdentifier;

            _logger.LogError(ex, "Error no controlado en {Method} {Path} (referencia {Referencia}).",
                context.Request.Method, context.Request.Path, referencia);

            // Si la respuesta ya empezó a enviarse no se puede reescribir el
            // estado; lo único correcto es cortar la conexión.
            if (context.Response.HasStarted)
            {
                context.Abort();
                return;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "text/plain; charset=utf-8";
            await context.Response.WriteAsync(
                "Ocurrió un error inesperado. Vuelve a intentarlo; si sigue pasando, avisa a soporte " +
                $"con esta referencia: {referencia}");
        }
    }
}
