using System.IO.Compression;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;

namespace UmesIsel.Api.Services;

public sealed record BackupInfo(string Nombre, long Bytes, DateTime CreadoEn);

/// <summary>
/// Respaldos de la base de datos.
///
/// Punto clave y la razón de que esto no sea un simple <c>File.Copy</c>: la base
/// corre en modo WAL, así que en cualquier momento los datos están repartidos
/// entre <c>isel.db</c> y <c>isel.db-wal</c>. Copiar solo el primero mientras la
/// aplicación escribe produce un archivo que ABRE SIN QUEJARSE pero al que le
/// faltan las últimas transacciones — el peor tipo de respaldo, el que parece
/// bueno hasta el día que hay que usarlo.
///
/// Aquí se usa <c>VACUUM INTO</c>, que es el mecanismo que SQLite ofrece
/// precisamente para esto: escribe una copia consistente y ya compactada, con la
/// base en uso y sin bloquear a nadie. El resultado se comprime, porque una base
/// SQLite es texto y números y baja muchísimo.
///
/// Lo que este servicio NO puede hacer por sí solo: sacar la copia de la
/// máquina. Un respaldo que vive en el mismo disco que el original no protege
/// contra el disco que se muere ni contra el ransomware. Ver el README de
/// despliegue para llevárselos fuera.
/// </summary>
public class BackupService
{
    private readonly IselDbContext _db;
    private readonly ILogger<BackupService> _logger;
    private readonly string _backupDir;
    private readonly int _retencionDias;

    /// <summary>Un respaldo a la vez: dos VACUUM INTO simultáneos compiten por el disco sin ganar nada.</summary>
    private static readonly SemaphoreSlim Gate = new(1, 1);

    public BackupService(IselDbContext db, IConfiguration config, IWebHostEnvironment env, ILogger<BackupService> logger)
    {
        _db = db;
        _logger = logger;
        _backupDir = config["Backups:Directory"] is { Length: > 0 } dir
            ? Path.GetFullPath(dir)
            : Path.Combine(env.ContentRootPath, "App_Data", "backups");
        _retencionDias = config.GetValue("Backups:RetentionDays", 30);
    }

    public string Directory => _backupDir;

    /// <summary>
    /// Crea un respaldo comprimido y borra los que pasaron de la retención.
    /// Devuelve el archivo creado.
    /// </summary>
    public async Task<FileInfo> CrearAsync(string motivo, CancellationToken ct = default)
    {
        await Gate.WaitAsync(ct);
        try
        {
            System.IO.Directory.CreateDirectory(_backupDir);

            var sello = DateTime.Now.ToString("yyyy-MM-dd_HHmmss");
            var temporal = Path.Combine(_backupDir, $"isel-{sello}.db");
            var destino = Path.Combine(_backupDir, $"isel-{sello}.db.gz");

            // VACUUM INTO exige que el destino no exista.
            if (File.Exists(temporal)) File.Delete(temporal);

            // SQLite no admite parámetros en VACUUM INTO: la ruta tiene que ir
            // como literal. Es seguro porque la construye este mismo método a
            // partir de la carpeta configurada y una marca de tiempo — nada de
            // aquí llega del usuario — y aun así se escapan las comillas simples.
            // Se silencia el aviso EF1002 con ese motivo, en vez de dejarlo
            // sonando para siempre y que acabe tapando uno de verdad.
            var rutaSql = temporal.Replace("'", "''");
#pragma warning disable EF1002
            await _db.Database.ExecuteSqlRawAsync($"VACUUM INTO '{rutaSql}';", ct);
#pragma warning restore EF1002

            await using (var origen = File.OpenRead(temporal))
            await using (var salida = File.Create(destino))
            await using (var gzip = new GZipStream(salida, CompressionLevel.Optimal))
            {
                await origen.CopyToAsync(gzip, ct);
            }
            File.Delete(temporal);

            var info = new FileInfo(destino);
            _logger.LogInformation("Respaldo creado ({Motivo}): {Archivo}, {KB} KB.", motivo, info.Name, info.Length / 1024);

            LimpiarAntiguos();
            return info;
        }
        finally
        {
            Gate.Release();
        }
    }

    /// <summary>
    /// Borra los respaldos que pasaron de la retención, pero SIEMPRE deja los
    /// tres más recientes en pie. Si la aplicación estuvo apagada un mes, la
    /// regla de los días sola borraría hasta el último respaldo que queda.
    /// </summary>
    private void LimpiarAntiguos()
    {
        try
        {
            var archivos = Listar();
            var limite = DateTime.UtcNow.AddDays(-_retencionDias);

            foreach (var archivo in archivos.Skip(3).Where(a => a.CreadoEn < limite))
            {
                File.Delete(Path.Combine(_backupDir, archivo.Nombre));
                _logger.LogInformation("Respaldo antiguo eliminado: {Archivo}.", archivo.Nombre);
            }
        }
        catch (Exception ex)
        {
            // Que falle la limpieza no puede invalidar el respaldo recién hecho.
            _logger.LogWarning(ex, "No se pudieron limpiar los respaldos antiguos.");
        }
    }

    /// <summary>Los respaldos disponibles, del más reciente al más viejo.</summary>
    public IReadOnlyList<BackupInfo> Listar()
    {
        if (!System.IO.Directory.Exists(_backupDir)) return Array.Empty<BackupInfo>();

        return new DirectoryInfo(_backupDir)
            .GetFiles("isel-*.db.gz")
            .OrderByDescending(f => f.CreationTimeUtc)
            .Select(f => new BackupInfo(f.Name, f.Length, f.CreationTimeUtc))
            .ToList();
    }

    /// <summary>
    /// Resuelve el nombre de un respaldo a su ruta real. Rechaza cualquier cosa
    /// que no sea exactamente un nombre de archivo de esta carpeta: sin esto, el
    /// endpoint de descarga sería un lector de archivos arbitrarios del servidor
    /// con solo mandar "../../appsettings.json".
    /// </summary>
    public string? ResolverRuta(string nombre)
    {
        if (string.IsNullOrWhiteSpace(nombre)) return null;
        if (nombre != Path.GetFileName(nombre)) return null;
        if (!nombre.StartsWith("isel-", StringComparison.Ordinal) ||
            !nombre.EndsWith(".db.gz", StringComparison.Ordinal))
        {
            return null;
        }

        var ruta = Path.GetFullPath(Path.Combine(_backupDir, nombre));
        // Cinturón y tirantes: aunque el nombre pasó los filtros, se comprueba
        // que la ruta resuelta siga estando dentro de la carpeta de respaldos.
        if (!ruta.StartsWith(Path.GetFullPath(_backupDir) + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            return null;
        }
        return File.Exists(ruta) ? ruta : null;
    }
}

/// <summary>
/// Dispara un respaldo al arrancar y luego uno cada 24 horas.
///
/// El del arranque importa más de lo que parece: es el que garantiza que existe
/// una copia de "cómo estaba antes" justo antes de aplicar migraciones nuevas en
/// un despliegue, que es el momento en que más fácil se pierde información.
/// </summary>
public class BackupHostedService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<BackupHostedService> _logger;
    private readonly TimeSpan _intervalo;
    private readonly bool _habilitado;

    public BackupHostedService(IServiceProvider services, IConfiguration config, ILogger<BackupHostedService> logger)
    {
        _services = services;
        _logger = logger;
        _intervalo = TimeSpan.FromHours(config.GetValue("Backups:IntervalHours", 24));
        _habilitado = config.GetValue("Backups:Enabled", true);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_habilitado)
        {
            _logger.LogWarning("Los respaldos automáticos están desactivados (Backups:Enabled = false).");
            return;
        }

        // Un respiro para no competir con el arranque (migraciones, siembra y el
        // calentamiento de LibreOffice).
        await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken).ContinueWith(_ => { }, CancellationToken.None);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var backups = scope.ServiceProvider.GetRequiredService<BackupService>();
                await backups.CrearAsync("automático", stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                // Nunca se deja morir el bucle: si el respaldo de hoy falla, hay
                // que volver a intentarlo mañana, no quedarse sin respaldos para
                // siempre hasta que alguien reinicie el servidor.
                _logger.LogError(ex, "Falló el respaldo automático; se reintentará en el siguiente ciclo.");
            }

            try
            {
                await Task.Delay(_intervalo, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }
}
