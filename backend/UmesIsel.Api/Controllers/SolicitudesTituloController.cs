using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;
using UmesIsel.Api.Security;
using UmesIsel.Api.Services;
using Microsoft.AspNetCore.RateLimiting;

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
/// <remarks>
/// Autorización: por defecto, administrador. El propio alumno solo puede tocar
/// SU solicitud, y esas acciones van marcadas una a una comprobando de quién es
/// la solicitud (la ruta trae el id de la solicitud, no el del alumno, así que la
/// comparación se hace dentro con <see cref="CurrentUser.IsAdminOr"/>).
///
/// Esta ficha guarda la FOTOGRAFÍA y la FIRMA del alumno. Antes cualquiera podía
/// recorrer /api/solicitudes-titulo/{id} y descargarse las dos.
/// </remarks>
[ApiController]
[Route("api/solicitudes-titulo")]
[RequireAdmin]
public class SolicitudesTituloController : ControllerBase
{
    private readonly IselDbContext _db;
    private readonly SolicitudTituloDocxBuilder _docxBuilder;
    private readonly FichaPdfBuilder _pdfConverter;
    private readonly SessionTokenService _tokens;
    private readonly AuditService _audit;
    private readonly CurrentUser _currentUser;

    public SolicitudesTituloController(
        IselDbContext db,
        SolicitudTituloDocxBuilder docxBuilder,
        FichaPdfBuilder pdfConverter,
        SessionTokenService tokens,
        AuditService audit,
        CurrentUser currentUser)
    {
        _db = db;
        _docxBuilder = docxBuilder;
        _pdfConverter = pdfConverter;
        _tokens = tokens;
        _audit = audit;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Comprueba que la solicitud sea del alumno de la sesión (o que quien llama
    /// sea admin). Devuelve la solicitud ya cargada para no consultarla dos veces.
    /// </summary>
    private async Task<(SolicitudTitulo? Solicitud, ActionResult? Error)> CargarPropiaAsync(int id, bool tracking = false)
    {
        var query = tracking ? FullQuery() : FullQuery().AsNoTracking();
        var solicitud = await query.FirstOrDefaultAsync(s => s.Id == id);
        if (solicitud is null) return (null, NotFound());
        if (!_currentUser.IsAdminOr(SessionRole.Student, solicitud.StudentId)) return (null, this.NoEsTuyo());
        return (solicitud, null);
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
    /// POST /api/solicitudes-titulo/acceso — carné MÁS correo institucional. La
    /// primera vez crea la solicitud ya sembrada con lo que el padrón sabe del
    /// alumno; después la reanuda tal como quedó, y devuelve la llave de sesión.
    ///
    /// Pedía solo el carné. Como los carnés son correlativos, eso permitía abrir
    /// —y editar— la solicitud de cualquiera, con su fotografía y su firma
    /// dentro. Ahora es la misma pareja de datos que el portal de asignación.
    /// </summary>
    [HttpPost("acceso")]
    [AllowAnonymousAccess]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    public async Task<ActionResult<SolicitudTituloAccesoResponse>> Acceso(SolicitudTituloAccesoRequest request)
    {
        var carnet = request.Carnet?.Trim();
        var correo = request.CorreoInstitucional?.Trim();
        if (string.IsNullOrWhiteSpace(carnet) || string.IsNullOrWhiteSpace(correo))
        {
            return BadRequest("Escribe tu número de carné y tu correo institucional.");
        }

        var student = await _db.Students.FirstOrDefaultAsync(s => s.Carnet == carnet);

        // Misma respuesta para "ese carné no existe" y "ese correo no es el suyo":
        // distinguirlas convertiría esta pantalla en un buscador de carnés válidos.
        if (student is null || !CorreoInstitucionalCoincide(student.CorreoInstitucional, correo))
        {
            await _audit.LogAsync(SecurityEventTypes.AccesoTituloFallido,
                $"carné {new string((carnet ?? string.Empty).Where(c => !char.IsControl(c)).Take(40).ToArray())}",
                actor: "anónimo", esAlerta: true);
            return Unauthorized("Los datos no coinciden con ningún alumno. Revísalos e intenta de nuevo.");
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

        // El token se ata al ALUMNO, no a la solicitud: es la misma identidad que
        // usa el portal de asignación, así que quien entra por aquí no necesita
        // volver a identificarse allá.
        var (token, expires) = _tokens.Issue(SessionRole.Student, student.Id, student.Carnet);
        await _audit.LogAsync(SecurityEventTypes.AccesoTitulo, actor: $"alumno:{student.Carnet}");

        return Ok(new SolicitudTituloAccesoResponse(ToDto(solicitud), token, expires));
    }

    /// <summary>
    /// Mismo criterio que el portal de asignación (ver AuthController): tolera
    /// mayúsculas, espacios y escribir solo la parte anterior a la arroba, pero
    /// no acepta otro dominio — el correo personal no sirve para entrar.
    /// </summary>
    private static bool CorreoInstitucionalCoincide(string? registrado, string escrito)
    {
        if (string.IsNullOrWhiteSpace(registrado)) return false;

        static string Norm(string v) =>
            new string(v.Where(c => !char.IsControl(c) && c is not (char)0x200B and not (char)0x200E and not (char)0xFEFF).ToArray())
                .Trim().ToLowerInvariant();

        var esperado = Norm(registrado);
        var recibido = Norm(escrito);
        if (esperado.Length == 0) return false;
        if (esperado == recibido) return true;

        var arroba = esperado.IndexOf((char)64);
        return arroba > 0 && recibido == esperado[..arroba];
    }

    /// <summary>Texto de un campo opcional: sin espacios de sobra, y vacío se guarda como null.</summary>
    private static string? Limpio(string? valor) =>
        string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();

    private static string Juntar(params string?[] partes) =>
        string.Join(' ', partes.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => p!.Trim()));

    [HttpGet("{id:int}")]
    [RequireSession]
    public async Task<ActionResult<SolicitudTituloDto>> GetById(int id)
    {
        var (solicitud, error) = await CargarPropiaAsync(id);
        return error ?? Ok(ToDto(solicitud!));
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
    [RequireSession]
    public async Task<ActionResult<SolicitudTituloDto>> Save(int id, SolicitudTituloUpsertRequest request)
    {
        var (solicitud, error) = await CargarPropiaAsync(id, tracking: true);
        if (error is not null) return error;

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
        solicitud!.Campus = request.Campus;
        solicitud.ParticipaCeremonia = request.ParticipaCeremonia;
        solicitud.Nombres = request.Nombres.Trim();
        solicitud.Apellidos = request.Apellidos.Trim();
        solicitud.FechaNacimiento = request.FechaNacimiento;
        solicitud.EstadoCivil = Limpio(request.EstadoCivil);
        solicitud.Sexo = Limpio(request.Sexo);
        solicitud.DireccionDomicilio = Limpio(request.DireccionDomicilio);
        solicitud.TelefonoDomicilio = Limpio(request.TelefonoDomicilio);
        solicitud.TelefonoCelular = Limpio(request.TelefonoCelular);
        solicitud.TelefonoEmergencia = Limpio(request.TelefonoEmergencia);
        solicitud.CorreoElectronico = Limpio(request.CorreoElectronico);
        solicitud.Empresa = Limpio(request.Empresa);
        solicitud.Cargo = Limpio(request.Cargo);
        solicitud.DireccionTrabajo = Limpio(request.DireccionTrabajo);
        solicitud.TelefonoTrabajo = Limpio(request.TelefonoTrabajo);
        solicitud.FacultadDepartamento = Limpio(request.FacultadDepartamento);
        solicitud.TituloObtener = Limpio(request.TituloObtener);
        solicitud.UpdatedAt = now;

        // Foto y firma: el cuerpo manda, igual que el resto de los campos.
        //
        // Antes null significaba "déjala como está", y eso hacía que la foto y la firma no se
        // pudieran quitar nunca: "Cambiar fotografía" y "Limpiar firma" mandan null, así que el
        // alumno las borraba en pantalla, guardaba, recargaba y volvían a aparecer. La ficha se
        // guarda entera de una sola vez (no por secciones), así que lo que llega ES el estado
        // completo: si no viene, es que ya no está.
        solicitud.FotoBase64 = Limpio(request.FotoBase64);

        var firma = Limpio(request.FirmaBase64);
        if (firma != solicitud.FirmaBase64)
        {
            solicitud.FirmaBase64 = firma;
            // El sello de firmado acompaña a la firma: si se borra, se va con ella.
            solicitud.FirmadoEn = firma is null ? null : now;
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
    [RequireSession]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
    public async Task<IActionResult> GetPdf(int id)
    {
        var (solicitud, error) = await CargarPropiaAsync(id);
        if (error is not null) return error;

        var bytes = _pdfConverter.ConvertToPdf(_docxBuilder.Build(ToDto(solicitud!)), "solicitud.docx");
        return File(bytes, PdfContentType, $"{FileLabel(solicitud!)} - Solicitud de titulo.pdf");
    }

    /// <summary>"Imprimir todas" del panel de admin — mismos filtros que GetAll, un PDF con todas.</summary>
    [HttpGet("batch.pdf")]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
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
