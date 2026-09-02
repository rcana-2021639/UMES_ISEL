using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;
using UmesIsel.Api.Security;
using UmesIsel.Api.Services;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// Las herramientas del panel: resumen de inicio, exportación, carga masiva de
/// alumnos y respaldos.
///
/// Todo exige sesión de administrador. La exportación y los respaldos, además,
/// quedan registrados en la bitácora: sacar el padrón completo en un archivo es
/// una operación legítima y a la vez la forma más silenciosa de llevarse los
/// datos de 170 personas, así que tiene que dejar rastro.
/// </summary>
[ApiController]
[Route("api/admin")]
[RequireAdmin]
public class AdminToolsController : ControllerBase
{
    private const string CsvContentType = "text/csv; charset=utf-8";

    private readonly IselDbContext _db;
    private readonly AuditService _audit;
    private readonly BackupService _backups;

    public AdminToolsController(IselDbContext db, AuditService audit, BackupService backups)
    {
        _db = db;
        _audit = audit;
        _backups = backups;
    }

    // --------------------------------------------------------------- resumen

    /// <summary>GET /api/admin/resumen — las cifras de la pantalla de inicio del panel.</summary>
    [HttpGet("resumen")]
    public async Task<ActionResult<ResumenDto>> Resumen()
    {
        var hoy = DateOnly.FromDateTime(DateTime.Now);
        var inicioSemana = hoy.AddDays(-(int)DateTime.Now.DayOfWeek);
        var hace7dias = DateTime.UtcNow.AddDays(-7);

        var alumnos = await _db.Students.AsNoTracking()
            .Select(s => new { s.Carrera, s.PapeleriaEnOrden })
            .ToListAsync();
        var fichas = await _db.CourseAssignments.AsNoTracking()
            .Select(a => new { a.Carrera, a.Fecha })
            .ToListAsync();

        var aspirantes = await _db.Applicants.AsNoTracking()
            .Where(a => a.MigradoStudentId == null)
            .Select(a => new
            {
                Carrera = a.Preinscripcion != null ? a.Preinscripcion.Carrera : null,
                Completo = a.Preinscripcion != null && a.AsignacionNuevoIngreso != null && a.CartaCompromiso != null,
            })
            .ToListAsync();

        var solicitudes = await _db.SolicitudesTitulo.AsNoTracking()
            .Include(s => s.Student)
            .Select(s => new { Carrera = s.Student!.Carrera, s.Entregada })
            .ToListAsync();

        // Las carreras del pénsum mandan el orden; se añaden al final las que
        // solo aparecen en registros históricos, para que no se pierda a nadie.
        var orden = await _db.Carreras.AsNoTracking().ToDictionaryAsync(c => c.Nombre, c => c.Orden);
        var nombres = alumnos.Select(a => a.Carrera)
            .Concat(fichas.Select(f => f.Carrera))
            .Concat(aspirantes.Where(a => a.Carrera != null).Select(a => a.Carrera!))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(n => orden.GetValueOrDefault(n, int.MaxValue))
            .ThenBy(n => n, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var porCarrera = nombres.Select(n => new ResumenCarreraDto(
            n,
            alumnos.Count(a => Igual(a.Carrera, n)),
            fichas.Count(f => Igual(f.Carrera, n)),
            aspirantes.Count(a => a.Carrera != null && Igual(a.Carrera, n)),
            solicitudes.Count(s => Igual(s.Carrera, n))
        )).ToList();

        return Ok(new ResumenDto(
            TotalAlumnos: alumnos.Count,
            TotalFichas: fichas.Count,
            FichasHoy: fichas.Count(f => f.Fecha == hoy),
            FichasEstaSemana: fichas.Count(f => f.Fecha >= inicioSemana && f.Fecha <= hoy),
            PapeleriaPendiente: alumnos.Count(a => !a.PapeleriaEnOrden),
            AspirantesEnProceso: aspirantes.Count(a => !a.Completo),
            AspirantesCompletos: aspirantes.Count(a => a.Completo),
            SolicitudesTituloPendientes: solicitudes.Count(s => !s.Entregada),
            AlertasSeguridad7Dias: await _db.SecurityEvents.CountAsync(e => e.EsAlerta && e.OcurridoEn >= hace7dias),
            UltimoRespaldo: _backups.Listar().FirstOrDefault()?.CreadoEn,
            PorCarrera: porCarrera));
    }

    private static bool Igual(string? a, string? b) => string.Equals(a, b, StringComparison.OrdinalIgnoreCase);

    // ----------------------------------------------------------- exportación

    /// <summary>
    /// GET /api/admin/exportar/alumnos.csv — el padrón completo, en el mismo
    /// formato de columnas del Excel del trimestre para que se pueda volver a
    /// importar tal cual.
    /// </summary>
    [HttpGet("exportar/alumnos.csv")]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
    public async Task<IActionResult> ExportarAlumnos([FromQuery] string? carrera)
    {
        var query = _db.Students.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(carrera)) query = query.Where(s => s.Carrera == carrera);

        var alumnos = await query.OrderBy(s => s.Carrera).ThenBy(s => s.PrimerApellido).ThenBy(s => s.PrimerNombre).ToListAsync();

        var csv = TabularService.BuildCsv(
            new[] { "Carne", "Nombre Completo", "Primer Apellido", "Segundo Apellido", "Primer Nombre", "Segundo Nombre",
                    "Carrera", "Seccion", "Trimestre", "Correo institucional", "Correo personal", "No. Celular", "Papeleria al dia" },
            alumnos.Select(s => new[]
            {
                s.Carnet, s.NombreCompleto, s.PrimerApellido, s.SegundoApellido, s.PrimerNombre, s.SegundoNombre,
                s.Carrera, s.Seccion, s.Trimestre?.ToString(), s.CorreoInstitucional, s.CorreoPersonal, s.Celular,
                s.PapeleriaEnOrden ? "Si" : "No",
            }));

        await _audit.LogAsync(SecurityEventTypes.DatosExportados, $"{alumnos.Count} alumnos", esAlerta: true);
        return File(csv, CsvContentType, TabularService.SafeFileName("Alumnos ISEL", "csv"));
    }

    /// <summary>GET /api/admin/exportar/asignaciones.csv — las fichas guardadas en un rango de fechas.</summary>
    [HttpGet("exportar/asignaciones.csv")]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
    public async Task<IActionResult> ExportarAsignaciones([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var query = _db.CourseAssignments.AsNoTracking()
            .Include(a => a.Student)
            .Include(a => a.CursosAsignados)
            .AsQueryable();
        if (from.HasValue) query = query.Where(a => a.Fecha >= from.Value);
        if (to.HasValue) query = query.Where(a => a.Fecha <= to.Value);

        var fichas = await query.OrderBy(a => a.Fecha).ThenBy(a => a.Student!.PrimerApellido).ToListAsync();

        var csv = TabularService.BuildCsv(
            new[] { "Fecha", "Carne", "Alumno", "Carrera", "Trimestre", "Seccion", "Tipo de pago", "Firmada", "Cursos asignados" },
            fichas.Select(a => new[]
            {
                a.Fecha.ToString("yyyy-MM-dd"),
                a.Student?.Carnet, a.Student?.NombreCompleto, a.Carrera, a.Trimestre.ToString(), a.Seccion,
                a.TipoPago, string.IsNullOrEmpty(a.FirmaBase64) ? "No" : "Si",
                string.Join(" | ", a.CursosAsignados.OrderBy(c => c.Numero).Select(c => c.Curso)),
            }));

        await _audit.LogAsync(SecurityEventTypes.DatosExportados, $"{fichas.Count} fichas de asignación", esAlerta: true);
        return File(csv, CsvContentType, TabularService.SafeFileName("Asignaciones ISEL", "csv"));
    }

    /// <summary>GET /api/admin/exportar/inscripciones.csv — los expedientes de nuevo ingreso y en qué punto van.</summary>
    [HttpGet("exportar/inscripciones.csv")]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
    public async Task<IActionResult> ExportarInscripciones()
    {
        var aspirantes = await _db.Applicants.AsNoTracking()
            .Include(a => a.Preinscripcion)
            .Include(a => a.AsignacionNuevoIngreso)
            .Include(a => a.CartaCompromiso)
            .Where(a => a.MigradoStudentId == null)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync();

        var csv = TabularService.BuildCsv(
            new[] { "Fecha", "DPI o pasaporte", "Nombre completo", "Carrera", "Trimestre", "Correo", "Celular",
                    "Preinscripcion", "Asignacion", "Carta de compromiso" },
            aspirantes.Select(a => new[]
            {
                a.CreatedAt.ToString("yyyy-MM-dd"),
                a.Dpi ?? a.Pasaporte,
                a.NombreCompleto ?? a.Preinscripcion?.NombreCompleto,
                a.Preinscripcion?.Carrera,
                a.AsignacionNuevoIngreso?.Trimestre.ToString(),
                a.Preinscripcion?.CorreoElectronico,
                a.Preinscripcion?.TelefonoCelular,
                a.Preinscripcion is null ? "No" : "Si",
                a.AsignacionNuevoIngreso is null ? "No" : "Si",
                a.CartaCompromiso is null ? "No" : "Si",
            }));

        await _audit.LogAsync(SecurityEventTypes.DatosExportados, $"{aspirantes.Count} inscripciones", esAlerta: true);
        return File(csv, CsvContentType, TabularService.SafeFileName("Inscripciones ISEL", "csv"));
    }

    // ---------------------------------------------------------- carga masiva

    /// <summary>
    /// POST /api/admin/importar/alumnos — carga masiva desde el Excel (.xlsx) o
    /// CSV del trimestre.
    ///
    /// Con <c>dryRun=true</c> (lo que hace la pantalla al elegir el archivo) NO
    /// escribe nada: solo dice qué pasaría. Esa pasada en seco es deliberada —
    /// una carga masiva a ciegas sobre el padrón es la operación con más
    /// capacidad de destrozo del panel, y aquí se ve el resultado antes de
    /// confirmar.
    ///
    /// Nunca borra: da de alta a los carnés nuevos y actualiza los que ya existen
    /// campo por campo, dejando en paz lo que el archivo traiga vacío. Un alumno
    /// que esté en la base y no en el archivo se queda como está.
    /// </summary>
    [HttpPost("importar/alumnos")]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<ActionResult<ImportResultDto>> ImportarAlumnos(IFormFile file, [FromQuery] bool dryRun = true)
    {
        if (file is null || file.Length == 0) return BadRequest("Selecciona un archivo.");
        if (file.Length > 12 * 1024 * 1024) return BadRequest("El archivo supera los 12 MB permitidos.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        List<List<string>> filas;

        try
        {
            await using var stream = file.OpenReadStream();
            if (ext == ".xlsx")
            {
                using var ms = new MemoryStream();
                await stream.CopyToAsync(ms);
                ms.Position = 0;
                filas = TabularService.ParseXlsx(ms);
            }
            else if (ext is ".csv" or ".txt")
            {
                using var reader = new StreamReader(stream, System.Text.Encoding.UTF8);
                filas = TabularService.ParseCsv(await reader.ReadToEndAsync());
            }
            else
            {
                return BadRequest("Solo se aceptan archivos .xlsx o .csv.");
            }
        }
        catch (Exception ex) when (ex is InvalidDataException or InvalidOperationException or System.Xml.XmlException)
        {
            // El detalle de la excepción no se filtra: diría rutas y nombres
            // internos. El mensaje es el que le sirve a quien sube el archivo.
            return BadRequest("No se pudo leer el archivo. Comprueba que sea un Excel (.xlsx) o un CSV válido.");
        }

        if (filas.Count < 2) return BadRequest("El archivo no tiene filas de datos debajo de los encabezados.");

        var encabezados = filas[0].Select(h => Normalizar(h)).ToList();
        var col = new Dictionary<string, int>();
        void Mapear(string clave, params string[] alias)
        {
            for (var i = 0; i < encabezados.Count; i++)
            {
                if (alias.Any(a => encabezados[i] == Normalizar(a))) { col[clave] = i; return; }
            }
        }

        // Los alias son los encabezados que de verdad trae el Excel del trimestre,
        // más las variantes que se escriben a mano.
        Mapear("carnet", "carne", "carné", "carnet", "no. carne", "numero de carne");
        Mapear("nombre", "nombre completo", "nombre", "alumno", "estudiante");
        Mapear("carrera", "carrera", "maestria", "maestría", "programa");
        Mapear("seccion", "seccion", "sección");
        Mapear("trimestre", "trimestre", "tri");
        Mapear("institucional", "correo institucional", "correo umes", "email institucional");
        Mapear("personal", "correo personal", "email personal", "correo");
        Mapear("celular", "no. celular", "celular", "telefono", "teléfono");

        if (!col.ContainsKey("carnet"))
        {
            return BadRequest("No se encontró una columna de carné. La primera fila del archivo tiene que ser la de encabezados.");
        }

        string? Campo(List<string> fila, string clave)
        {
            if (!col.TryGetValue(clave, out var i) || i >= fila.Count) return null;
            var v = fila[i].Trim();
            return v.Length == 0 ? null : v;
        }

        var problemas = new List<ImportProblemaDto>();
        var existentes = await _db.Students.ToDictionaryAsync(s => s.Carnet, StringComparer.OrdinalIgnoreCase);
        var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int nuevos = 0, actualizados = 0, omitidos = 0;
        var ahora = DateTime.UtcNow;

        for (var f = 1; f < filas.Count; f++)
        {
            var fila = filas[f];
            var numeroFila = f + 1;
            var carnet = Campo(fila, "carnet");

            if (string.IsNullOrWhiteSpace(carnet) || !carnet.All(char.IsDigit) || carnet.Length < 6)
            {
                problemas.Add(new ImportProblemaDto(numeroFila, carnet ?? "(vacío)",
                    "Sin carné válido: el carné es la llave con la que el alumno entra al portal."));
                omitidos++;
                continue;
            }
            if (!vistos.Add(carnet))
            {
                problemas.Add(new ImportProblemaDto(numeroFila, carnet, "Ese carné aparece dos veces en el archivo; se usó la primera."));
                omitidos++;
                continue;
            }

            var nombre = Campo(fila, "nombre");
            var carrera = Campo(fila, "carrera");

            if (existentes.TryGetValue(carnet, out var alumno))
            {
                // Actualiza solo lo que el archivo trae: una celda vacía no borra
                // lo que ya se sabía de esa persona.
                if (nombre is not null) AplicarNombre(alumno, nombre);
                if (carrera is not null) alumno.Carrera = carrera;
                if (Campo(fila, "seccion") is { } sec) alumno.Seccion = sec;
                if (int.TryParse(Campo(fila, "trimestre"), out var tri)) alumno.Trimestre = tri;
                if (Campo(fila, "institucional") is { } ci) alumno.CorreoInstitucional = ci;
                if (Campo(fila, "personal") is { } cp) alumno.CorreoPersonal = cp;
                if (Campo(fila, "celular") is { } cel) alumno.Celular = cel;
                alumno.UpdatedAt = ahora;
                actualizados++;
            }
            else
            {
                if (nombre is null || carrera is null)
                {
                    problemas.Add(new ImportProblemaDto(numeroFila, carnet,
                        "Alumno nuevo sin nombre o sin carrera: los dos son obligatorios para darlo de alta."));
                    omitidos++;
                    continue;
                }

                var nuevo = new Student { Carnet = carnet, Carrera = carrera, CreatedAt = ahora, UpdatedAt = ahora };
                AplicarNombre(nuevo, nombre);
                nuevo.Seccion = Campo(fila, "seccion");
                nuevo.Trimestre = int.TryParse(Campo(fila, "trimestre"), out var t) ? t : null;
                nuevo.CorreoInstitucional = Campo(fila, "institucional");
                nuevo.CorreoPersonal = Campo(fila, "personal");
                nuevo.Celular = Campo(fila, "celular");

                _db.Students.Add(nuevo);
                existentes[carnet] = nuevo;
                nuevos++;
            }
        }

        if (dryRun)
        {
            // Se descarta TODO lo que el seguimiento de cambios haya acumulado:
            // sin esto, cualquier SaveChanges posterior de la misma petición
            // escribiría lo que se prometió no escribir.
            _db.ChangeTracker.Clear();
        }
        else
        {
            await _db.SaveChangesAsync();
            await _audit.LogAsync(SecurityEventTypes.DatosImportados,
                $"{nuevos} altas y {actualizados} actualizaciones desde {Path.GetFileName(file.FileName)}", esAlerta: true);
        }

        return Ok(new ImportResultDto(
            Simulacion: dryRun,
            FilasLeidas: filas.Count - 1,
            NuevosAlumnos: nuevos,
            Actualizados: actualizados,
            Omitidos: omitidos,
            Problemas: problemas.Take(100).ToList(),
            ColumnasDetectadas: col.Keys.OrderBy(k => k).ToList()));
    }

    /// <summary>
    /// Reparte un nombre corrido en las cuatro casillas de la ficha. Acepta las
    /// dos formas que trae el Excel: "Apellidos, Nombres" (con coma) y el nombre
    /// corrido "Apellido1 Apellido2 Nombre1 Nombre2".
    /// </summary>
    private static void AplicarNombre(Student alumno, string nombreCompleto)
    {
        var texto = nombreCompleto.Trim();
        string apellidos, nombres;

        var coma = texto.IndexOf(',');
        if (coma > 0)
        {
            apellidos = texto[..coma].Trim();
            nombres = texto[(coma + 1)..].Trim();
        }
        else
        {
            var partes = texto.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var corte = partes.Length >= 4 ? 2 : partes.Length >= 3 ? 2 : 1;
            apellidos = string.Join(' ', partes.Take(corte));
            nombres = string.Join(' ', partes.Skip(corte));
        }

        var ap = apellidos.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var no = nombres.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        alumno.PrimerApellido = ap.ElementAtOrDefault(0) ?? string.Empty;
        alumno.SegundoApellido = ap.Length > 1 ? string.Join(' ', ap.Skip(1)) : null;
        alumno.PrimerNombre = no.ElementAtOrDefault(0) ?? string.Empty;
        alumno.SegundoNombre = no.Length > 1 ? string.Join(' ', no.Skip(1)) : null;
        alumno.NombreCompleto = $"{apellidos}, {nombres}";
    }

    /// <summary>Minúsculas, sin tildes y sin espacios de sobra, para comparar encabezados escritos de cualquier manera.</summary>
    private static string Normalizar(string value) =>
        new string(value.Normalize(System.Text.NormalizationForm.FormD)
                .Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
                .ToArray())
            .Trim().ToLowerInvariant();

    // -------------------------------------------------------------- respaldos

    [HttpGet("respaldos")]
    public ActionResult<IReadOnlyList<BackupInfoDto>> ListarRespaldos() =>
        Ok(_backups.Listar().Select(b => new BackupInfoDto(b.Nombre, b.Bytes, b.CreadoEn)).ToList());

    /// <summary>POST /api/admin/respaldos — fuerza un respaldo ahora (además del automático diario).</summary>
    [HttpPost("respaldos")]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
    public async Task<ActionResult<BackupInfoDto>> CrearRespaldo()
    {
        var archivo = await _backups.CrearAsync("manual");
        await _audit.LogAsync(SecurityEventTypes.RespaldoCreado, archivo.Name);
        return Ok(new BackupInfoDto(archivo.Name, archivo.Length, archivo.CreationTimeUtc));
    }

    /// <summary>
    /// GET /api/admin/respaldos/{nombre} — descarga un respaldo para guardarlo
    /// fuera del servidor, que es lo único que protege de que se muera el disco.
    ///
    /// El nombre se valida contra la carpeta de respaldos (ver
    /// <c>BackupService.ResolverRuta</c>): sin eso, esto sería un lector de
    /// archivos arbitrarios del servidor.
    /// </summary>
    [HttpGet("respaldos/{nombre}")]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
    public async Task<IActionResult> DescargarRespaldo(string nombre)
    {
        var ruta = _backups.ResolverRuta(nombre);
        if (ruta is null) return NotFound();

        await _audit.LogAsync(SecurityEventTypes.RespaldoDescargado, nombre, esAlerta: true);
        return PhysicalFile(ruta, "application/gzip", nombre);
    }
}
