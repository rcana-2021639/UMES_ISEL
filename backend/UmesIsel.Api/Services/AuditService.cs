using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Entities;
using UmesIsel.Api.Security;

namespace UmesIsel.Api.Services;

/// <summary>
/// Escribe en la bitácora de seguridad. Un único punto para que todos los
/// registros salgan con el mismo formato y para que sea imposible colar un dato
/// sensible por descuido: el detalle se recorta y la IP se normaliza aquí.
/// </summary>
public class AuditService
{
    private readonly IselDbContext _db;
    private readonly IHttpContextAccessor _http;
    private readonly CurrentUser _currentUser;
    private readonly ILogger<AuditService> _logger;

    public AuditService(IselDbContext db, IHttpContextAccessor http, CurrentUser currentUser, ILogger<AuditService> logger)
    {
        _db = db;
        _http = http;
        _currentUser = currentUser;
        _logger = logger;
    }

    /// <summary>
    /// Registra un suceso. <paramref name="actor"/> se pasa a mano solo cuando
    /// todavía no hay sesión (un login fallido, por ejemplo); si no, se deduce
    /// de quién está llamando.
    /// </summary>
    public async Task LogAsync(string tipo, string? detalle = null, string? actor = null, bool esAlerta = false)
    {
        var evento = new SecurityEvent
        {
            OcurridoEn = DateTime.UtcNow,
            Tipo = tipo,
            Actor = Recortar(actor ?? DescribirActor(), 120),
            Ip = ClientIp(),
            Detalle = Recortar(detalle, 400),
            EsAlerta = esAlerta,
        };

        _db.SecurityEvents.Add(evento);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // La auditoría no puede tumbar la operación que estaba auditando: si
            // la escritura falla, queda al menos en el log del servidor.
            _logger.LogError(ex, "No se pudo registrar el evento de seguridad {Tipo} de {Actor}.", tipo, evento.Actor);
            _db.Entry(evento).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
        }
    }

    private string DescribirActor()
    {
        if (!_currentUser.IsAuthenticated) return "anónimo";
        var prefijo = _currentUser.Role switch
        {
            SessionRole.Admin => "admin",
            SessionRole.Student => "alumno",
            SessionRole.Applicant => "aspirante",
            _ => "?",
        };
        return $"{prefijo}:{_currentUser.Display}";
    }

    /// <summary>
    /// La IP del cliente. Detrás de un proxy inverso (Nginx, IIS ARR, Cloudflare)
    /// la dirección de la conexión es la del proxy, así que la real llega en
    /// X-Forwarded-For. Se toma la PRIMERA de la lista y solo si la aplicación
    /// está configurada para confiar en esa cabecera (ver ForwardedHeaders en
    /// Program.cs) — de lo contrario cualquiera podría falsear su IP en la
    /// bitácora simplemente mandando la cabecera.
    /// </summary>
    private string? ClientIp()
    {
        var ctx = _http.HttpContext;
        if (ctx is null) return null;
        var ip = ctx.Connection.RemoteIpAddress?.ToString();
        return string.IsNullOrWhiteSpace(ip) ? null : Recortar(ip, 64);
    }

    private static string Recortar(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var v = value.Trim();
        return v.Length <= max ? v : v[..max];
    }
}
