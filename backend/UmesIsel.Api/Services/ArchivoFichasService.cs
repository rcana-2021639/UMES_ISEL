using System.IO.Compression;
using System.Text;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Controllers;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Entities;

namespace UmesIsel.Api.Services;

/// <summary>
/// "Reiniciar asignaciones": guarda el PDF de cada ficha en un ZIP y, solo si eso salió bien,
/// borra las fichas para que la siguiente temporada empiece limpia. Ver <see cref="ArchivoFichas"/>.
///
/// Corre en segundo plano porque convertir una ficha a PDF le cuesta a LibreOffice un par de
/// segundos: ochenta fichas son varios minutos, más de lo que aguanta abierta una petición detrás
/// del proxy. El panel pregunta el estado hasta que pasa a "listo" o "error".
///
/// El orden es lo que protege los datos: respaldo de la base, ZIP completo en disco, y el borrado
/// al final. Si algo falla antes de terminar el ZIP, no se borra ninguna ficha. Y se borran
/// exactamente las fichas que entraron al ZIP: una que un alumno guarde mientras se genera ya es
/// de la temporada nueva y se queda.
/// </summary>
public class ArchivoFichasService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly FichaPdfBuilder _pdfBuilder;
    private readonly FichaXlsxBuilder _xlsxBuilder;
    private readonly ILogger<ArchivoFichasService> _logger;
    private readonly string _dir;

    /// <summary>Un reinicio a la vez: dos a la vez se pelearían por las mismas fichas.</summary>
    private static readonly SemaphoreSlim Gate = new(1, 1);

    public ArchivoFichasService(
        IServiceScopeFactory scopes,
        FichaPdfBuilder pdfBuilder,
        FichaXlsxBuilder xlsxBuilder,
        IWebHostEnvironment env,
        IConfiguration config,
        ILogger<ArchivoFichasService> logger)
    {
        _scopes = scopes;
        _pdfBuilder = pdfBuilder;
        _xlsxBuilder = xlsxBuilder;
        _logger = logger;
        _dir = Path.Combine(DocumentStorageService.DataDirectory(env, config), "archivo-fichas");
    }

    /// <summary>
    /// Registra el reinicio y lo lanza en segundo plano. Lanza <see cref="InvalidOperationException"/>
    /// con un mensaje para el panel si no hay nada que archivar o ya hay otro en curso.
    /// </summary>
    public async Task<ArchivoFichas> IniciarAsync(IselDbContext db, string etiqueta, string actor)
    {
        if (!Gate.Wait(0))
        {
            throw new InvalidOperationException("Ya se está generando un archivo de fichas. Espera a que termine.");
        }

        try
        {
            var ids = await db.CourseAssignments.Select(ca => ca.Id).ToListAsync();
            if (ids.Count == 0)
            {
                throw new InvalidOperationException("No hay fichas guardadas: no hay nada que reiniciar.");
            }

            var archivo = new ArchivoFichas
            {
                Etiqueta = etiqueta,
                Estado = EstadosArchivoFichas.Generando,
                CantidadFichas = ids.Count,
                CreadoPor = actor,
                CreadoEn = DateTime.UtcNow,
            };
            db.ArchivosFichas.Add(archivo);
            await db.SaveChangesAsync();

            var archivoId = archivo.Id;
            _ = Task.Run(async () =>
            {
                try
                {
                    await EjecutarAsync(archivoId, ids, actor);
                }
                finally
                {
                    Gate.Release();
                }
            });
            return archivo;
        }
        catch
        {
            Gate.Release();
            throw;
        }
    }

    /// <summary>
    /// Al arrancar: un archivo que se quedó en "generando" es de un reinicio que el apagado del
    /// servidor cortó a medias. Como el borrado va al final, sus fichas siguen ahí; se marca como
    /// fallido para que el panel no espere para siempre y se pueda volver a intentar.
    /// </summary>
    public static void MarcarInterrumpidos(IselDbContext db)
    {
        var colgados = db.ArchivosFichas.Where(a => a.Estado == EstadosArchivoFichas.Generando).ToList();
        foreach (var a in colgados)
        {
            a.Estado = EstadosArchivoFichas.Error;
            a.Error = "El servidor se reinició mientras se generaba. No se borró ninguna ficha; vuelve a intentarlo.";
            a.TerminadoEn = DateTime.UtcNow;
        }
        if (colgados.Count > 0) db.SaveChanges();
    }

    /// <summary>La ruta del ZIP de un archivo, o null si no existe en disco.</summary>
    public string? RutaDe(ArchivoFichas archivo)
    {
        if (archivo.NombreArchivo is null || archivo.NombreArchivo != Path.GetFileName(archivo.NombreArchivo)) return null;
        var ruta = Path.Combine(_dir, archivo.NombreArchivo);
        return File.Exists(ruta) ? ruta : null;
    }

    private async Task EjecutarAsync(int archivoId, List<int> ids, string actor)
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IselDbContext>();
        var archivo = await db.ArchivosFichas.FirstAsync(a => a.Id == archivoId);
        string? temporal = null;

        try
        {
            // Por si acaso: una copia de la base tal como estaba, fichas incluidas, antes de tocar nada.
            await scope.ServiceProvider.GetRequiredService<BackupService>().CrearAsync("antes de reiniciar asignaciones");

            var fichas = await db.CourseAssignments.AsNoTracking()
                .Include(ca => ca.Student)
                .Include(ca => ca.CursosAsignados)
                .Include(ca => ca.CursosAdicionales)
                .Where(ca => ids.Contains(ca.Id))
                .OrderBy(ca => ca.Carrera).ThenBy(ca => ca.Student!.PrimerApellido).ThenBy(ca => ca.Student!.PrimerNombre)
                .ToListAsync();

            Directory.CreateDirectory(_dir);
            var nombre = $"fichas-{AhoraEnGuatemala():yyyy-MM-dd_HHmmss}.zip";
            temporal = Path.Combine(_dir, nombre + ".tmp");
            var sinPdf = new List<string>();

            await using (var salida = File.Create(temporal))
            using (var zip = new ZipArchive(salida, ZipArchiveMode.Create))
            {
                var usados = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var listado = new StringBuilder();
                listado.AppendLine("Carné;Nombre;Maestría;Trimestre;Sección;Fecha de la ficha;Tipo de pago;Impresa el;Archivo");

                foreach (var ca in fichas)
                {
                    var dto = CourseAssignmentsController.ToDto(ca);
                    // La ficha sale como salió a papel: con la firma del admin y la fecha del día en que se
                    // imprimió. Una que nunca se imprimió queda sin esa firma, que es lo que era.
                    DateOnly? impresaEl = ca.ImpresaEn is DateTime i ? DateOnly.FromDateTime(EnGuatemala(i)) : null;

                    var (bytes, extension) = ConvertirConReintento(dto, impresaEl);
                    if (extension != "pdf") sinPdf.Add(ca.Student?.Carnet ?? ca.Id.ToString());

                    var entrada = NombreUnico(usados,
                        $"{Limpiar(ca.Carrera)}/Ficha - {Limpiar(ca.Student?.Carnet ?? "")} - {Limpiar($"{ca.Student?.PrimerApellido} {ca.Student?.PrimerNombre}")} - trimestre {ca.Trimestre}",
                        extension);
                    var entry = zip.CreateEntry(entrada, CompressionLevel.Optimal);
                    await using (var s = entry.Open())
                    {
                        await s.WriteAsync(bytes);
                    }

                    listado.AppendLine(string.Join(';',
                        Csv(ca.Student?.Carnet), Csv(ca.Student?.NombreCompleto), Csv(ca.Carrera), ca.Trimestre.ToString(),
                        Csv(ca.Seccion), ca.Fecha.ToString("dd/MM/yyyy"), Csv(ca.TipoPago),
                        impresaEl?.ToString("dd/MM/yyyy") ?? "No", Csv(entrada)));
                }

                // Con BOM: Excel abre así las tildes bien sin tener que importar el archivo a mano.
                var csv = zip.CreateEntry("Listado de fichas.csv", CompressionLevel.Optimal);
                await using (var s = csv.Open())
                {
                    var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(listado.ToString())).ToArray();
                    await s.WriteAsync(bytes);
                }
            }

            var final = Path.Combine(_dir, nombre);
            File.Move(temporal, final);
            temporal = null;

            // Solo ahora, con el ZIP completo en disco, se borran. Las filas de cursos se van con
            // ellas por la cascada de la base.
            var borradas = await db.CourseAssignments.Where(ca => ids.Contains(ca.Id)).ExecuteDeleteAsync();

            archivo.Estado = EstadosArchivoFichas.Listo;
            archivo.NombreArchivo = nombre;
            archivo.Bytes = new FileInfo(final).Length;
            archivo.CantidadFichas = fichas.Count;
            archivo.TerminadoEn = DateTime.UtcNow;
            archivo.Error = sinPdf.Count == 0
                ? null
                : $"{sinPdf.Count} ficha(s) se guardaron en Excel porque no se pudieron convertir a PDF: {string.Join(", ", sinPdf)}.";
            await db.SaveChangesAsync();

            await scope.ServiceProvider.GetRequiredService<AuditService>().LogAsync(
                SecurityEventTypes.RegistroEliminado,
                $"reinicio de asignaciones «{archivo.Etiqueta}»: {borradas} fichas archivadas en {nombre} y borradas del panel",
                actor: actor, esAlerta: true);
            _logger.LogInformation("Reinicio de asignaciones: {Cantidad} fichas archivadas en {Archivo}.", borradas, nombre);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falló el reinicio de asignaciones {Id}; no se borró ninguna ficha.", archivoId);
            if (temporal is not null)
            {
                try { File.Delete(temporal); } catch { /* queda un .tmp huérfano, nada más */ }
            }
            archivo.Estado = EstadosArchivoFichas.Error;
            archivo.Error = "No se pudo generar el archivo, así que no se borró ninguna ficha. Vuelve a intentarlo en unos minutos.";
            archivo.TerminadoEn = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
    }

    /// <summary>
    /// PDF, con un segundo intento: LibreOffice a veces falla una conversión suelta cuando alguien
    /// imprime a la vez. Si falla dos veces se guarda el Excel de la ficha: una ficha en Excel se
    /// puede convertir después, una ficha que no se guardó ya no existe.
    /// </summary>
    private (byte[] Bytes, string Extension) ConvertirConReintento(Models.Dtos.CourseAssignmentDto dto, DateOnly? impresaEl)
    {
        var firmaAdmin = impresaEl is not null;
        for (var intento = 1; intento <= 2; intento++)
        {
            try
            {
                return (_pdfBuilder.BuildOne(dto, firmaAdmin, impresaEl), "pdf");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo convertir a PDF la ficha {Id} (intento {Intento}).", dto.Id, intento);
                Thread.Sleep(TimeSpan.FromSeconds(3));
            }
        }
        return (_xlsxBuilder.Build(dto, firmaAdmin, impresaEl), "xlsx");
    }

    private static string NombreUnico(HashSet<string> usados, string baseName, string extension)
    {
        var nombre = $"{baseName}.{extension}";
        for (var n = 2; !usados.Add(nombre); n++) nombre = $"{baseName} ({n}).{extension}";
        return nombre;
    }

    private static string Limpiar(string texto)
    {
        var invalidos = Path.GetInvalidFileNameChars();
        var limpio = string.Concat(texto.Trim().Select(c => invalidos.Contains(c) || c == '/' || c == '\\' ? '_' : c));
        return limpio.Length == 0 ? "sin nombre" : limpio.Length > 90 ? limpio[..90] : limpio;
    }

    private static string Csv(string? valor)
    {
        var v = valor ?? string.Empty;
        return v.Contains(';') || v.Contains('"') ? $"\"{v.Replace("\"", "\"\"")}\"" : v;
    }

    private static DateTime AhoraEnGuatemala() => EnGuatemala(DateTime.UtcNow);

    private static DateTime EnGuatemala(DateTime utc)
    {
        try
        {
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc),
                TimeZoneInfo.FindSystemTimeZoneById("America/Guatemala"));
        }
        catch (TimeZoneNotFoundException)
        {
            return utc.AddHours(-6);
        }
    }
}
