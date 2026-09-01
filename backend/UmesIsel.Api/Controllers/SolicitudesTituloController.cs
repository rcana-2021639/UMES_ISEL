using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;
using UmesIsel.Api.Services;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// "Solicitud de Impresión de Título" — el tercer trámite público, junto a Inscripción (aspirantes
/// sin carné) y Asignación (alumnos con carné). Este es de alumnos con carné, así que se entra igual
/// que al portal de asignación: solo el número, sin contraseña, y de ahí salen ya llenos el carné,
/// los nombres, los apellidos y la carrera.
///
/// Un alumno tiene una sola solicitud viva: volver a entrar con el mismo carné la reanuda. Cuando
/// Secretaría la procesa, el admin la marca como entregada y deja de contar como pendiente.
/// </summary>
[ApiController]
[Route("api/solicitudes-titulo")]
public class SolicitudesTituloController : ControllerBase
{
    private readonly IselDbContext _db;
    private readonly SolicitudTituloDocxBuilder _docxBuilder;
    private readonly FichaPdfBuilder _pdfConverter;

    public SolicitudesTituloController(IselDbContext db, SolicitudTituloDocxBuilder docxBuilder, FichaPdfBuilder pdfConverter)
    {
        _db = db;
        _docxBuilder = docxBuilder;
        _pdfConverter = pdfConverter;
    }

    private const string PdfContentType = "application/pdf";

    /// <summary>
    /// Tope de la foto ya recortada que manda el frontend (data URL en base64). El recorte apunta a
    /// ~700x891 px en JPEG, que ronda los 120 KB; 3 MB deja margen de sobra para una cámara buena y
    /// aun así corta en seco cualquier intento de subir un archivo sin procesar.
    /// </summary>
    private const int MaxFotoBase64Chars = 3 * 1024 * 1024;

    private const string FacultadPorDefecto = "Instituto Salesiano de Educación en Línea (ISEL)";

    // ---- Mapeo ---------------------------------------------------------------------------------

    private static SolicitudTituloDto ToDto(SolicitudTitulo s) => new(
        s.Id, s.StudentId, s.Carnet,
        s.Student?.NombreCompleto ?? $"{s.Apellidos}, {s.Nombres}".Trim(' ', ','),
        s.Student?.Carrera ?? string.Empty,
        s.Campus, s.FechaSolicitud, s.ParticipaCeremonia, s.Nombres, s.Apellidos, s.FechaNacimiento,
        s.EstadoCivil, s.Sexo, s.DireccionDomicilio, s.TelefonoDomicilio, s.TelefonoCelular,
        s.TelefonoEmergencia, s.CorreoElectronico, s.Empresa, s.Cargo, s.DireccionTrabajo,
        s.TelefonoTrabajo, s.FacultadDepartamento, s.TituloObtener, s.FotoBase64, s.FirmaBase64,
        s.FirmadoEn, s.Entregada, s.EntregadaEn, s.UpdatedAt);

    /// <summary>Una solicitud está "completa" cuando ya se puede imprimir sin huecos importantes.</summary>
    private static bool EsCompleta(SolicitudTitulo s) =>
        !string.IsNullOrWhiteSpace(s.Nombres)
        && !string.IsNullOrWhiteSpace(s.Apellidos)
        && !string.IsNullOrWhiteSpace(s.Campus)
        && !string.IsNullOrWhiteSpace(s.Sexo)
        && s.FechaNacimiento is not null
        && !string.IsNullOrWhiteSpace(s.CorreoElectronico)
        && !string.IsNullOrWhiteSpace(s.TituloObtener)
        && !string.IsNullOrWhiteSpace(s.FotoBase64)
        && !string.IsNullOrWhiteSpace(s.FirmaBase64);

    private static SolicitudTituloListItemDto ToListItemDto(SolicitudTitulo s) => new(
        s.Id, s.Carnet,
        s.Student?.NombreCompleto ?? $"{s.Apellidos}, {s.Nombres}".Trim(' ', ','),
        s.Student?.Carrera ?? string.Empty,
        s.Campus, s.FechaSolicitud, s.ParticipaCeremonia,
        !string.IsNullOrWhiteSpace(s.FotoBase64), !string.IsNullOrWhiteSpace(s.FirmaBase64),
        EsCompleta(s), s.Entregada);

    private IQueryable<SolicitudTitulo> FullQuery() => _db.SolicitudesTitulo.Include(s => s.Student);

    // ---- Acceso --------------------------------------------------------------------------------

    /// <summary>
    /// POST /api/solicitudes-titulo/acceso — solo el carné. La primera vez crea la solicitud ya
    /// sembrada con lo que el padrón sabe del alumno; después la reanuda tal como quedó.
    /// </summary>
    [HttpPost("acceso")]
    public async Task<ActionResult<SolicitudTituloDto>> Acceso(SolicitudTituloAccesoRequest request)
    {
        var carnet = request.Carnet?.Trim();
        if (string.IsNullOrWhiteSpace(carnet))
        {
            return BadRequest("Escribe tu número de carné.");
        }

        var student = await _db.Students.FirstOrDefaultAsync(s => s.Carnet == carnet);
        if (student is null)
        {
            return NotFound("No encontramos ese carné. Verifica el número e intenta de nuevo.");
        }

        var solicitud = await FullQuery().FirstOrDefaultAsync(s => s.StudentId == student.Id);
        if (solicitud is null)
        {
            var now = DateTime.UtcNow;
            solicitud = new SolicitudTitulo
            {
                StudentId = student.Id,
                Carnet = student.Carnet,
                FechaSolicitud = DateOnly.FromDateTime(DateTime.Now),
                // Lo que el padrón ya sabe: no se vuelve a teclear (sigue siendo editable en la ficha).
                Nombres = Juntar(student.PrimerNombre, student.SegundoNombre),
                Apellidos = Juntar(student.PrimerApellido, student.SegundoApellido),
                CorreoElectronico = student.CorreoInstitucional ?? student.CorreoPersonal,
                TelefonoCelular = student.Celular,
                FacultadDepartamento = FacultadPorDefecto,
                TituloObtener = student.Carrera,
                Campus = CampusSolicitud.CentroSalesiano,
                ParticipaCeremonia = true,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.SolicitudesTitulo.Add(solicitud);
            await _db.SaveChangesAsync();
            solicitud.Student = student;
        }
        else if (solicitud.Entregada)
        {
            return Conflict("Esta solicitud ya fue procesada por Secretaría — si necesitas corregir algo, comunícate con ellos.");
        }

        return Ok(ToDto(solicitud));
    }

    private static string Juntar(params string?[] partes) =>
        string.Join(' ', partes.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => p!.Trim()));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SolicitudTituloDto>> GetById(int id)
    {
        var solicitud = await FullQuery().AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
        return solicitud is null ? NotFound() : Ok(ToDto(solicitud));
    }

    /// <summary>GET /api/solicitudes-titulo?estado=completa|pendiente|entregada — la tabla del panel de admin.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SolicitudTituloListItemDto>>> GetAll(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? estado)
    {
        var solicitudes = await FullQuery().AsNoTracking().OrderByDescending(s => s.CreatedAt).ToListAsync();

        var items = solicitudes
            .Where(s => !from.HasValue || s.FechaSolicitud >= from.Value)
            .Where(s => !to.HasValue || s.FechaSolicitud <= to.Value)
            .Select(s => (Entity: s, Dto: ToListItemDto(s)))
            .Where(x => estado switch
            {
                "completa" => x.Dto.Completa && !x.Dto.Entregada,
                "pendiente" => !x.Dto.Completa && !x.Dto.Entregada,
                "entregada" => x.Dto.Entregada,
                _ => true,
            })
            .Select(x => x.Dto)
            .ToList();

        return Ok(items);
    }

    // ---- Guardar -------------------------------------------------------------------------------

    [HttpPut("{id:int}")]
    public async Task<ActionResult<SolicitudTituloDto>> Save(int id, SolicitudTituloUpsertRequest request)
    {
        var solicitud = await FullQuery().FirstOrDefaultAsync(s => s.Id == id);
        if (solicitud is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Nombres) || string.IsNullOrWhiteSpace(request.Apellidos))
        {
            return BadRequest("Nombres y apellidos son obligatorios.");
        }
        if (request.Campus is not null && !CampusSolicitud.EsValido(request.Campus))
        {
            return BadRequest("La sede seleccionada no existe.");
        }
        if (request.Sexo is not null and not "" and not "F" and not "M")
        {
            return BadRequest("El sexo debe ser F o M.");
        }
        if (request.FotoBase64 is { Length: > MaxFotoBase64Chars })
        {
            return BadRequest("La fotografía pesa demasiado. Vuelve a tomarla o sube una imagen más liviana.");
        }
        // Las rejillas del FORMATO son de ancho fijo: lo que no cabe no se imprimiría, así que se
        // rechaza aquí en vez de recortarlo en silencio.
        if (request.Nombres.Trim().Length > SolicitudTituloDocxBuilder.CasillasNombres)
        {
            return BadRequest($"Los nombres no caben en la ficha: máximo {SolicitudTituloDocxBuilder.CasillasNombres} caracteres.");
        }
        if (request.Apellidos.Trim().Length > SolicitudTituloDocxBuilder.CasillasApellidos)
        {
            return BadRequest($"Los apellidos no caben en la ficha: máximo {SolicitudTituloDocxBuilder.CasillasApellidos} caracteres.");
        }

        var now = DateTime.UtcNow;
        solicitud.Campus = request.Campus;
        solicitud.ParticipaCeremonia = request.ParticipaCeremonia;
        solicitud.Nombres = request.Nombres.Trim();
        solicitud.Apellidos = request.Apellidos.Trim();
        solicitud.FechaNacimiento = request.FechaNacimiento;
        solicitud.EstadoCivil = request.EstadoCivil?.Trim();
        solicitud.Sexo = string.IsNullOrWhiteSpace(request.Sexo) ? null : request.Sexo;
        solicitud.DireccionDomicilio = request.DireccionDomicilio?.Trim();
        solicitud.TelefonoDomicilio = request.TelefonoDomicilio?.Trim();
        solicitud.TelefonoCelular = request.TelefonoCelular?.Trim();
        solicitud.TelefonoEmergencia = request.TelefonoEmergencia?.Trim();
        solicitud.CorreoElectronico = request.CorreoElectronico?.Trim();
        solicitud.Empresa = request.Empresa?.Trim();
        solicitud.Cargo = request.Cargo?.Trim();
        solicitud.DireccionTrabajo = request.DireccionTrabajo?.Trim();
        solicitud.TelefonoTrabajo = request.TelefonoTrabajo?.Trim();
        solicitud.FacultadDepartamento = request.FacultadDepartamento?.Trim();
        solicitud.TituloObtener = request.TituloObtener?.Trim();
        solicitud.UpdatedAt = now;

        // Foto y firma: una cadena vacía significa "quítala", null significa "déjala como está".
        if (request.FotoBase64 is not null)
        {
            solicitud.FotoBase64 = string.IsNullOrWhiteSpace(request.FotoBase64) ? null : request.FotoBase64;
        }
        if (!string.IsNullOrWhiteSpace(request.FirmaBase64))
        {
            solicitud.FirmaBase64 = request.FirmaBase64;
            solicitud.FirmadoEn = now;
        }

        await _db.SaveChangesAsync();
        return Ok(ToDto(solicitud));
    }

    /// <summary>PATCH /api/solicitudes-titulo/{id}/entregada — Secretaría la da por procesada (o la reabre).</summary>
    [HttpPatch("{id:int}/entregada")]
    public async Task<ActionResult<SolicitudTituloDto>> MarcarEntregada(int id, MarcarEntregadaRequest request)
    {
        var solicitud = await FullQuery().FirstOrDefaultAsync(s => s.Id == id);
        if (solicitud is null) return NotFound();

        solicitud.Entregada = request.Entregada;
        solicitud.EntregadaEn = request.Entregada ? DateTime.UtcNow : null;
        solicitud.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToDto(solicitud));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var solicitud = await _db.SolicitudesTitulo.FirstOrDefaultAsync(s => s.Id == id);
        if (solicitud is null) return NotFound();

        _db.SolicitudesTitulo.Remove(solicitud);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---- Impresión -----------------------------------------------------------------------------

    [HttpGet("{id:int}/solicitud.pdf")]
    public async Task<IActionResult> GetPdf(int id)
    {
        var solicitud = await FullQuery().AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
        if (solicitud is null) return NotFound();

        var bytes = _pdfConverter.ConvertToPdf(_docxBuilder.Build(ToDto(solicitud)), "solicitud.docx");
        return File(bytes, PdfContentType, $"{FileLabel(solicitud)} - Solicitud de titulo.pdf");
    }

    /// <summary>"Imprimir todas" del panel de admin — mismos filtros que GetAll, un PDF con todas.</summary>
    [HttpGet("batch.pdf")]
    public async Task<IActionResult> GetBatchPdf([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? estado)
    {
        var solicitudes = await FullQuery().AsNoTracking().ToListAsync();
        var filtradas = solicitudes
            .Where(s => !from.HasValue || s.FechaSolicitud >= from.Value)
            .Where(s => !to.HasValue || s.FechaSolicitud <= to.Value)
            .Where(s => estado switch
            {
                "completa" => EsCompleta(s) && !s.Entregada,
                "pendiente" => !EsCompleta(s) && !s.Entregada,
                "entregada" => s.Entregada,
                _ => true,
            })
            .OrderBy(s => s.FechaSolicitud)
            .ToList();

        if (filtradas.Count == 0) return NotFound("No hay solicitudes de título para ese rango/filtro.");

        var pdfs = filtradas.Select(s => _pdfConverter.ConvertToPdf(_docxBuilder.Build(ToDto(s)), "solicitud.docx")).ToList();
        var bytes = pdfs.Count == 1 ? pdfs[0] : FichaPdfBuilder.MergePdfs(pdfs);
        return File(bytes, PdfContentType, "Solicitudes de titulo.pdf");
    }

    private static string FileLabel(SolicitudTitulo s)
    {
        var nombre = s.Student?.NombreCompleto ?? $"{s.Apellidos}, {s.Nombres}".Trim(' ', ',');
        var label = $"{s.Carnet} - {(string.IsNullOrWhiteSpace(nombre) ? "Alumno" : nombre)}";
        return string.Concat(label.Select(ch => Path.GetInvalidFileNameChars().Contains(ch) ? '_' : ch));
    }
}
