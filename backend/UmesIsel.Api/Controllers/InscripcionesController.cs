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
/// El módulo de Inscripción: aspirantes de nuevo ingreso que todavía no tienen carné ni sección.
/// Mismo espíritu que <see cref="CourseAssignmentsController"/> (acceso sin contraseña, upsert por
/// reemplazo total de cada sección, impresión en PDF por fecha/rango) pero sobre <see cref="Applicant"/>
/// en vez de <see cref="Student"/>, y con un botón final —"migrar"— que gradúa un aspirante a alumno
/// real una vez el otro departamento le da carné y sección.
/// </summary>
/// <remarks>
/// Autorización: por defecto todo el controlador es de administrador. Las
/// acciones que el propio aspirante usa para llenar SU expediente están marcadas
/// una por una con el id del expediente, y la puerta de entrada
/// (<c>POST acceso</c>) es la única pública.
///
/// Antes nada de esto estaba protegido: cambiar el número en
/// /api/inscripciones/{id} enseñaba el expediente completo del siguiente
/// aspirante —DPI, dirección, teléfono de emergencia— y su PDF combinado.
/// </remarks>
[ApiController]
[Route("api/inscripciones")]
[RequireAdmin]
public class InscripcionesController : ControllerBase
{
    private readonly IselDbContext _db;
    private readonly InscripcionPdfBuilder _pdfBuilder;
    private readonly SessionTokenService _tokens;
    private readonly AuditService _audit;
    private readonly CurrentUser _currentUser;

    public InscripcionesController(
        IselDbContext db,
        InscripcionPdfBuilder pdfBuilder,
        SessionTokenService tokens,
        AuditService audit,
        CurrentUser currentUser)
    {
        _db = db;
        _pdfBuilder = pdfBuilder;
        _tokens = tokens;
        _audit = audit;
        _currentUser = currentUser;
    }

    private const string PdfContentType = "application/pdf";

    private IQueryable<Applicant> FullQuery() =>
        _db.Applicants
            .Include(a => a.Preinscripcion)
            .Include(a => a.AsignacionNuevoIngreso!).ThenInclude(x => x.CursosAsignados)
            .Include(a => a.AsignacionNuevoIngreso!).ThenInclude(x => x.CursosAdicionales)
            .Include(a => a.CartaCompromiso)
            .Include(a => a.Documentos);

    // ---- Mapeo a DTOs -----------------------------------------------------------------------

    /// <summary>
    /// El nombre del aspirante, o cadena vacía si todavía no ha escrito ninguno. Devolver
    /// aquí un texto de relleno ("(sin nombre)") era un error: este valor no solo se pinta
    /// en la tabla del admin, también precarga el campo "Nombre completo" de la carta de
    /// compromiso — y el aspirante se encontraba ese literal escrito dentro del campo.
    /// Quien lo muestre pone su propio rótulo (ver <see cref="DisplayNombre"/>).
    /// </summary>
    private static string ComputeNombreCompleto(Applicant a)
    {
        if (a.AsignacionNuevoIngreso is { } asn)
        {
            return BuildNombreCompleto(asn.PrimerApellido, asn.SegundoApellido, asn.PrimerNombre, asn.SegundoNombre);
        }
        return a.Preinscripcion?.NombreCompleto ?? a.NombreCompleto ?? string.Empty;
    }

    /// <summary>Para rótulos que no pueden quedar en blanco (nombres de archivo, PDF).</summary>
    private static string DisplayNombre(Applicant a)
    {
        var nombre = ComputeNombreCompleto(a);
        return string.IsNullOrWhiteSpace(nombre) ? "Aspirante sin nombre" : nombre;
    }

    private static string BuildNombreCompleto(string primerApellido, string? segundoApellido, string primerNombre, string? segundoNombre)
    {
        var apellidos = string.Join(' ', new[] { primerApellido, segundoApellido }.Where(s => !string.IsNullOrWhiteSpace(s)));
        var nombres = string.Join(' ', new[] { primerNombre, segundoNombre }.Where(s => !string.IsNullOrWhiteSpace(s)));
        return $"{apellidos}, {nombres}";
    }

    private static PreinscripcionDto ToPreinscripcionDto(Preinscripcion p) => new(
        p.NombreCompleto, p.Dpi, p.NoPasaporte, p.Carrera, p.Jornada, p.FechaNacimiento, p.Genero,
        p.LugarNacimiento, p.Nacionalidad, p.DireccionCompleta, p.Departamento, p.Municipio, p.EstadoCivil,
        p.ComunidadLinguistica, p.PuebloPertenencia, p.IdiomaMaterno, p.CorreoElectronico, p.TelefonoCelular,
        p.TelefonoCasa, p.Emergencia1Nombre, p.Emergencia1Telefono, p.Emergencia2Nombre, p.Emergencia2Telefono,
        p.TieneAlergia, p.AlergiaDescripcion, p.TieneProblemaSalud, p.SaludDescripcion, p.FirmaBase64, p.FirmadoEn
    );

    private static AsignacionNuevoIngresoDto ToAsignacionDto(AsignacionNuevoIngreso a) => new(
        a.PrimerApellido, a.SegundoApellido, a.PrimerNombre, a.SegundoNombre, a.Fecha, a.Trimestre, a.Carrera,
        a.Seccion,
        a.CursosAsignados.OrderBy(r => r.Numero).Select(r => new AssignedCourseRowDto(r.Numero, r.Curso, r.SemTri, r.Seccion)).ToList(),
        a.CursosAdicionales.OrderBy(r => r.Numero).Select(r => new AdditionalCourseRowDto(r.Numero, r.CursoAdicional, r.Carrera, r.SemTri, r.Seccion, r.Jornada)).ToList(),
        a.TienePendientesTrimestres, a.TienePendientesMaterias, a.CorreoContacto, a.TelefonoContacto, a.TipoPago, a.FirmaBase64, a.FirmadoEn
    );

    private static CartaCompromisoDto ToCompromisoDto(CartaCompromiso c) => new(
        c.Fecha, c.Carrera, c.EsExtranjero, c.NombreCompleto, c.NoDpi, c.FirmaBase64, c.FirmadoEn
    );

    private static ApplicantDto ToApplicantDto(Applicant a) => new(
        a.Id, a.Dpi, a.Pasaporte, a.PrimerApellido, a.SegundoApellido, a.PrimerNombre, a.SegundoNombre,
        ComputeNombreCompleto(a), a.EsExtranjero, a.MigradoStudentId, a.MigradoEn, a.UpdatedAt,
        a.Preinscripcion is null ? null : ToPreinscripcionDto(a.Preinscripcion),
        a.AsignacionNuevoIngreso is null ? null : ToAsignacionDto(a.AsignacionNuevoIngreso),
        a.CartaCompromiso is null ? null : ToCompromisoDto(a.CartaCompromiso),
        a.Documentos.Select(d => new ApplicantDocumentDto(d.Tipo, d.FileName, d.SizeBytes, d.UploadedAt)).ToList()
    );

    private static ApplicantListItemDto ToListItemDto(Applicant a)
    {
        var fichaCompleta = a.Preinscripcion is not null && a.AsignacionNuevoIngreso is not null && a.CartaCompromiso is not null;
        var requeridos = DocumentoTipos.Requeridos(a.EsExtranjero);
        var subidos = a.Documentos.Count(d => requeridos.Contains(d.Tipo));
        return new ApplicantListItemDto(
            a.Id, a.Dpi, a.Pasaporte, ComputeNombreCompleto(a),
            a.AsignacionNuevoIngreso?.Carrera ?? a.Preinscripcion?.Carrera,
            a.AsignacionNuevoIngreso?.Seccion, a.AsignacionNuevoIngreso?.Trimestre, a.EsExtranjero,
            a.MigradoStudentId is not null, fichaCompleta, subidos, requeridos.Length,
            DateOnly.FromDateTime(a.CreatedAt)
        );
    }

    // Recién migrado: aún no tiene documentos propios (los del aspirante viven aparte) ni respuesta
    // a "¿papelería al día?" — de ahí el false/0.
    private static StudentDto ToStudentDto(Student s) => new(
        s.Id, s.Carnet, s.PrimerApellido, s.SegundoApellido, s.PrimerNombre, s.SegundoNombre,
        s.NombreCompleto, s.Carrera, s.Seccion, s.Trimestre, s.CorreoInstitucional, s.CorreoPersonal, s.Celular,
        s.PapeleriaEnOrden, 0);

    // ---- Acceso / consulta -------------------------------------------------------------------

    /// <summary>
    /// POST /api/inscripciones/acceso — DPI o pasaporte; crea el expediente la
    /// primera vez, o reanuda el que ya existía.
    ///
    /// Es la única acción pública del controlador, y la que reparte la llave: al
    /// entrar se emite un token de sesión atado a ESE expediente, y todo lo demás
    /// —leer, guardar, imprimir, subir documentos— lo exige. Sin él, el aspirante
    /// podía llenar su ficha, sí, pero también leer la del resto cambiando el
    /// número de la URL.
    ///
    /// El DPI sigue siendo la única credencial, porque un aspirante todavía no
    /// tiene nada más: no hay carné, ni correo institucional, ni contraseña que
    /// darle antes de que se inscriba. Lo que sí se hace es no premiar el ensayo
    /// y error — límite de intentos por IP — y registrar cada acceso.
    /// </summary>
    [HttpPost("acceso")]
    [AllowAnonymousAccess]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    public async Task<ActionResult<InscripcionAccesoResponse>> Acceso(InscripcionAccesoRequest request)
    {
        var dpi = string.IsNullOrWhiteSpace(request.Dpi) ? null : request.Dpi.Trim();
        var pasaporte = string.IsNullOrWhiteSpace(request.Pasaporte) ? null : request.Pasaporte.Trim();
        if (dpi is null && pasaporte is null)
        {
            return BadRequest("Ingresa tu DPI o tu número de pasaporte.");
        }

        var applicant = await FullQuery().FirstOrDefaultAsync(a =>
            (dpi != null && a.Dpi == dpi) || (pasaporte != null && a.Pasaporte == pasaporte));

        if (applicant is null)
        {
            var now = DateTime.UtcNow;
            applicant = new Applicant { Dpi = dpi, Pasaporte = pasaporte, CreatedAt = now, UpdatedAt = now };
            _db.Applicants.Add(applicant);
            await _db.SaveChangesAsync();
        }
        else if (applicant.MigradoStudentId is not null)
        {
            return Conflict("Esta inscripción ya fue revisada y migrada a la base de datos de alumnos — si necesitas corregir algo, contacta a coordinación.");
        }

        var (token, expires) = _tokens.Issue(SessionRole.Applicant, applicant.Id, $"exp-{applicant.Id}");
        // El DPI NO se registra en la bitácora: es un dato personal, y el
        // identificador interno del expediente basta para reconstruir qué pasó.
        await _audit.LogAsync(SecurityEventTypes.AccesoInscripcion, $"expediente {applicant.Id}", actor: $"aspirante:exp-{applicant.Id}");

        return Ok(new InscripcionAccesoResponse(ToApplicantDto(applicant), token, expires));
    }

    [HttpGet("{id:int}")]
    [RequireOwnerOrAdmin(SessionRole.Applicant, "id")]
    public async Task<ActionResult<ApplicantDto>> GetById(int id)
    {
        var applicant = await FullQuery().AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        return applicant is null ? NotFound() : Ok(ToApplicantDto(applicant));
    }

    /// <summary>GET /api/inscripciones?from=&to=&estado=completa|pendiente — listado del panel admin (excluye a los ya migrados).</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ApplicantListItemDto>>> GetAll(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? estado)
    {
        var query = FullQuery().AsNoTracking().Where(a => a.MigradoStudentId == null);
        var applicants = await query.OrderByDescending(a => a.CreatedAt).ToListAsync();

        var items = applicants
            .Where(a => !from.HasValue || DateOnly.FromDateTime(a.CreatedAt) >= from.Value)
            .Where(a => !to.HasValue || DateOnly.FromDateTime(a.CreatedAt) <= to.Value)
            .Select(ToListItemDto)
            .ToList();

        if (string.Equals(estado, "completa", StringComparison.OrdinalIgnoreCase))
        {
            items = items.Where(i => i.FichaCompleta).ToList();
        }
        else if (string.Equals(estado, "pendiente", StringComparison.OrdinalIgnoreCase))
        {
            items = items.Where(i => !i.FichaCompleta).ToList();
        }

        return Ok(items);
    }

    // ---- Guardar cada sección (reemplazo total, igual que CourseAssignmentsController.Save) ----

    [HttpPut("{id:int}/preinscripcion")]
    [RequireOwnerOrAdmin(SessionRole.Applicant, "id")]
    public async Task<ActionResult<PreinscripcionDto>> SavePreinscripcion(int id, PreinscripcionUpsertRequest request)
    {
        var applicant = await _db.Applicants.Include(a => a.Preinscripcion).FirstOrDefaultAsync(a => a.Id == id);
        if (applicant is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.NombreCompleto) || string.IsNullOrWhiteSpace(request.Carrera))
        {
            return BadRequest("Nombre completo y carrera son obligatorios.");
        }

        var now = DateTime.UtcNow;
        var pre = applicant.Preinscripcion;
        var isNew = pre is null;
        pre ??= new Preinscripcion { ApplicantId = id, CreatedAt = now };

        pre.NombreCompleto = request.NombreCompleto.Trim();
        pre.Dpi = request.Dpi?.Trim();
        pre.NoPasaporte = request.NoPasaporte?.Trim();
        pre.Carrera = request.Carrera.Trim();
        pre.Jornada = request.Jornada?.Trim();
        pre.FechaNacimiento = request.FechaNacimiento;
        pre.Genero = request.Genero?.Trim();
        pre.LugarNacimiento = request.LugarNacimiento?.Trim();
        pre.Nacionalidad = request.Nacionalidad?.Trim();
        pre.DireccionCompleta = request.DireccionCompleta?.Trim();
        pre.Departamento = request.Departamento?.Trim();
        pre.Municipio = request.Municipio?.Trim();
        pre.EstadoCivil = request.EstadoCivil?.Trim();
        pre.ComunidadLinguistica = request.ComunidadLinguistica?.Trim();
        pre.PuebloPertenencia = request.PuebloPertenencia?.Trim();
        pre.IdiomaMaterno = request.IdiomaMaterno?.Trim();
        pre.CorreoElectronico = request.CorreoElectronico?.Trim();
        pre.TelefonoCelular = request.TelefonoCelular?.Trim();
        pre.TelefonoCasa = request.TelefonoCasa?.Trim();
        pre.Emergencia1Nombre = request.Emergencia1Nombre?.Trim();
        pre.Emergencia1Telefono = request.Emergencia1Telefono?.Trim();
        pre.Emergencia2Nombre = request.Emergencia2Nombre?.Trim();
        pre.Emergencia2Telefono = request.Emergencia2Telefono?.Trim();
        pre.TieneAlergia = request.TieneAlergia;
        pre.AlergiaDescripcion = request.AlergiaDescripcion?.Trim();
        pre.TieneProblemaSalud = request.TieneProblemaSalud;
        pre.SaludDescripcion = request.SaludDescripcion?.Trim();
        pre.UpdatedAt = now;
        if (!string.IsNullOrWhiteSpace(request.FirmaBase64))
        {
            pre.FirmaBase64 = request.FirmaBase64;
            pre.FirmadoEn = now;
        }

        if (isNew) _db.Preinscripciones.Add(pre);

        applicant.NombreCompleto = pre.NombreCompleto;
        if (!string.IsNullOrEmpty(pre.Dpi)) applicant.Dpi = pre.Dpi;
        applicant.UpdatedAt = now;

        await _db.SaveChangesAsync();
        return Ok(ToPreinscripcionDto(pre));
    }

    [HttpPut("{id:int}/asignacion")]
    [RequireOwnerOrAdmin(SessionRole.Applicant, "id")]
    public async Task<ActionResult<AsignacionNuevoIngresoDto>> SaveAsignacion(int id, AsignacionNuevoIngresoUpsertRequest request)
    {
        var applicant = await _db.Applicants
            .Include(a => a.AsignacionNuevoIngreso).ThenInclude(x => x!.CursosAsignados)
            .Include(a => a.AsignacionNuevoIngreso).ThenInclude(x => x!.CursosAdicionales)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (applicant is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.PrimerApellido) || string.IsNullOrWhiteSpace(request.PrimerNombre) || string.IsNullOrWhiteSpace(request.Carrera))
        {
            return BadRequest("Primer apellido, primer nombre y carrera son obligatorios.");
        }

        var now = DateTime.UtcNow;
        var asn = applicant.AsignacionNuevoIngreso;
        var isNew = asn is null;
        if (asn is null)
        {
            asn = new AsignacionNuevoIngreso { ApplicantId = id, CreatedAt = now };
        }
        else
        {
            _db.AsignacionNuevoIngresoCursoRows.RemoveRange(asn.CursosAsignados);
            _db.AsignacionNuevoIngresoAdicionalRows.RemoveRange(asn.CursosAdicionales);
            asn.CursosAsignados.Clear();
            asn.CursosAdicionales.Clear();
        }

        asn.PrimerApellido = request.PrimerApellido.Trim();
        asn.SegundoApellido = request.SegundoApellido?.Trim();
        asn.PrimerNombre = request.PrimerNombre.Trim();
        asn.SegundoNombre = request.SegundoNombre?.Trim();
        asn.Fecha = DateOnly.FromDateTime(DateTime.Now);
        asn.Trimestre = request.Trimestre;
        asn.Carrera = request.Carrera.Trim();
        asn.Seccion = request.Seccion?.Trim();
        asn.TienePendientesTrimestres = request.TienePendientesTrimestres;
        asn.TienePendientesMaterias = request.TienePendientesMaterias;
        asn.CorreoContacto = request.CorreoContacto?.Trim();
        asn.TelefonoContacto = request.TelefonoContacto?.Trim();
        asn.TipoPago = string.IsNullOrWhiteSpace(request.TipoPago) ? null : request.TipoPago.Trim();
        asn.UpdatedAt = now;
        if (!string.IsNullOrWhiteSpace(request.FirmaBase64))
        {
            asn.FirmaBase64 = request.FirmaBase64;
            asn.FirmadoEn = now;
        }

        foreach (var row in request.CursosAsignados.Where(r => !string.IsNullOrWhiteSpace(r.Curso)))
        {
            asn.CursosAsignados.Add(new AsignacionNuevoIngresoCursoRow { Numero = row.Numero, Curso = row.Curso.Trim(), SemTri = row.SemTri, Seccion = row.Seccion });
        }
        foreach (var row in request.CursosAdicionales.Where(r => !string.IsNullOrWhiteSpace(r.CursoAdicional)))
        {
            asn.CursosAdicionales.Add(new AsignacionNuevoIngresoAdicionalRow { Numero = row.Numero, CursoAdicional = row.CursoAdicional.Trim(), Carrera = row.Carrera, SemTri = row.SemTri, Seccion = row.Seccion, Jornada = row.Jornada });
        }

        if (isNew) _db.AsignacionesNuevoIngreso.Add(asn);

        applicant.NombreCompleto = BuildNombreCompleto(asn.PrimerApellido, asn.SegundoApellido, asn.PrimerNombre, asn.SegundoNombre);
        applicant.UpdatedAt = now;

        await _db.SaveChangesAsync();

        var saved = await _db.AsignacionesNuevoIngreso
            .Include(a => a.CursosAsignados).Include(a => a.CursosAdicionales)
            .AsNoTracking().FirstAsync(a => a.Id == asn.Id);
        return Ok(ToAsignacionDto(saved));
    }

    [HttpPut("{id:int}/compromiso")]
    [RequireOwnerOrAdmin(SessionRole.Applicant, "id")]
    public async Task<ActionResult<CartaCompromisoDto>> SaveCompromiso(int id, CartaCompromisoUpsertRequest request)
    {
        var applicant = await _db.Applicants.Include(a => a.CartaCompromiso).FirstOrDefaultAsync(a => a.Id == id);
        if (applicant is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Carrera) || string.IsNullOrWhiteSpace(request.NombreCompleto) || string.IsNullOrWhiteSpace(request.NoDpi))
        {
            return BadRequest("Carrera, nombre completo y DPI son obligatorios.");
        }

        var now = DateTime.UtcNow;
        var c = applicant.CartaCompromiso;
        var isNew = c is null;
        c ??= new CartaCompromiso { ApplicantId = id, CreatedAt = now };

        c.Fecha = DateOnly.FromDateTime(DateTime.Now);
        c.Carrera = request.Carrera.Trim();
        c.EsExtranjero = request.EsExtranjero;
        c.NombreCompleto = request.NombreCompleto.Trim();
        c.NoDpi = request.NoDpi.Trim();
        c.UpdatedAt = now;
        if (!string.IsNullOrWhiteSpace(request.FirmaBase64))
        {
            c.FirmaBase64 = request.FirmaBase64;
            c.FirmadoEn = now;
        }

        if (isNew) _db.CartasCompromiso.Add(c);

        applicant.EsExtranjero = request.EsExtranjero;
        applicant.UpdatedAt = now;

        await _db.SaveChangesAsync();
        return Ok(ToCompromisoDto(c));
    }

    // ---- Migrar a la base de datos de alumnos ----------------------------------------------

    /// <summary>POST /api/inscripciones/{id}/migrar — una vez el otro departamento asigna carné y sección, crea el Student real (+ su ficha de asignación sembrada).</summary>
    [HttpPost("{id:int}/migrar")]
    public async Task<ActionResult<StudentDto>> Migrar(int id, MigrarAspiranteRequest request)
    {
        var applicant = await FullQuery().FirstOrDefaultAsync(a => a.Id == id);
        if (applicant is null) return NotFound();
        if (applicant.MigradoStudentId is not null)
        {
            return Conflict("Este aspirante ya fue migrado.");
        }
        if (string.IsNullOrWhiteSpace(request.Carnet))
        {
            return BadRequest("El carné es obligatorio.");
        }
        if (applicant.AsignacionNuevoIngreso is null)
        {
            return BadRequest("Falta llenar la ficha de asignación de cursos de este aspirante antes de migrarlo.");
        }
        var carnetTaken = await _db.Students.AnyAsync(s => s.Carnet == request.Carnet);
        if (carnetTaken)
        {
            return Conflict("Ya existe un alumno con ese carné.");
        }

        var asn = applicant.AsignacionNuevoIngreso;
        var now = DateTime.UtcNow;
        var seccion = request.Seccion?.Trim() ?? asn.Seccion;
        var trimestre = request.Trimestre ?? asn.Trimestre;

        var student = new Student
        {
            Carnet = request.Carnet.Trim(),
            PrimerApellido = asn.PrimerApellido,
            SegundoApellido = asn.SegundoApellido,
            PrimerNombre = asn.PrimerNombre,
            SegundoNombre = asn.SegundoNombre,
            NombreCompleto = BuildNombreCompleto(asn.PrimerApellido, asn.SegundoApellido, asn.PrimerNombre, asn.SegundoNombre),
            Carrera = asn.Carrera,
            Seccion = seccion,
            Trimestre = trimestre,
            CorreoPersonal = applicant.Preinscripcion?.CorreoElectronico ?? asn.CorreoContacto,
            Celular = applicant.Preinscripcion?.TelefonoCelular ?? asn.TelefonoContacto,
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.Students.Add(student);
        await _db.SaveChangesAsync(); // necesitamos el Id para sembrar la ficha de asignación

        var ca = new CourseAssignment
        {
            StudentId = student.Id,
            // La fecha de la ficha es el día en que la ficha entra al padrón, no el
            // día en que el aspirante la llenó. Es la misma regla que sigue el portal
            // (cada guardado regenera la ficha con la fecha de ese día) y es lo que
            // espera quien administra: las asignaciones se revisan e imprimen por
            // "Hoy". Con la fecha del aspirante, un alumno inscrito la semana pasada y
            // agregado hoy no aparecía en ningún rango que el administrador mirara
            // después de agregarlo — la ficha estaba creada, pero fuera de la vista.
            Fecha = DateOnly.FromDateTime(DateTime.Now),
            Trimestre = trimestre,
            Carrera = asn.Carrera,
            Seccion = seccion,
            TienePendientesTrimestres = asn.TienePendientesTrimestres,
            TienePendientesMaterias = asn.TienePendientesMaterias,
            CorreoContacto = asn.CorreoContacto,
            TelefonoContacto = asn.TelefonoContacto,
            TipoPago = asn.TipoPago,
            FirmaBase64 = asn.FirmaBase64,
            FirmadoEn = asn.FirmadoEn,
            AutorizadoPorCodigo = "MIGRADO-INSCRIPCION",
            CreatedAt = now,
            UpdatedAt = now,
        };
        foreach (var row in asn.CursosAsignados)
        {
            ca.CursosAsignados.Add(new AssignedCourseRow { Numero = row.Numero, Curso = row.Curso, SemTri = row.SemTri, Seccion = row.Seccion });
        }
        foreach (var row in asn.CursosAdicionales)
        {
            ca.CursosAdicionales.Add(new AdditionalCourseRow { Numero = row.Numero, CursoAdicional = row.CursoAdicional, Carrera = row.Carrera, SemTri = row.SemTri, Seccion = row.Seccion, Jornada = row.Jornada });
        }
        _db.CourseAssignments.Add(ca);

        applicant.MigradoStudentId = student.Id;
        applicant.MigradoEn = now;
        applicant.UpdatedAt = now;

        await _db.SaveChangesAsync();
        return Ok(ToStudentDto(student));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var applicant = await _db.Applicants.FirstOrDefaultAsync(a => a.Id == id);
        if (applicant is null) return NotFound();

        _db.Applicants.Remove(applicant);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---- Impresión ---------------------------------------------------------------------------

    [HttpGet("{id:int}/preinscripcion.pdf")]
    [RequireOwnerOrAdmin(SessionRole.Applicant, "id")]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
    public async Task<IActionResult> GetPreinscripcionPdf(int id)
    {
        var applicant = await FullQuery().AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        if (applicant?.Preinscripcion is null) return NotFound();
        var bytes = _pdfBuilder.BuildPreinscripcion(ToPreinscripcionDto(applicant.Preinscripcion));
        return File(bytes, PdfContentType, $"{FileLabel(applicant)} - Preinscripcion.pdf");
    }

    [HttpGet("{id:int}/asignacion.pdf")]
    [RequireOwnerOrAdmin(SessionRole.Applicant, "id")]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
    public async Task<IActionResult> GetAsignacionPdf(int id)
    {
        var applicant = await FullQuery().AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        if (applicant?.AsignacionNuevoIngreso is null) return NotFound();
        var bytes = _pdfBuilder.BuildAsignacion(ToAsignacionDto(applicant.AsignacionNuevoIngreso), DisplayNombre(applicant));
        return File(bytes, PdfContentType, $"{FileLabel(applicant)} - Asignacion.pdf");
    }

    [HttpGet("{id:int}/compromiso.pdf")]
    [RequireOwnerOrAdmin(SessionRole.Applicant, "id")]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
    public async Task<IActionResult> GetCompromisoPdf(int id)
    {
        var applicant = await FullQuery().AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        if (applicant?.CartaCompromiso is null) return NotFound();
        var subidos = applicant.Documentos.Select(d => d.Tipo).ToHashSet();
        var bytes = _pdfBuilder.BuildCompromiso(ToCompromisoDto(applicant.CartaCompromiso), subidos);
        return File(bytes, PdfContentType, $"{FileLabel(applicant)} - Compromiso.pdf");
    }

    /// <summary>Las 3 fichas que ya existan, combinadas — botón "Imprimir" del panel de admin.</summary>
    [HttpGet("{id:int}/completas.pdf")]
    [RequireOwnerOrAdmin(SessionRole.Applicant, "id")]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
    public async Task<IActionResult> GetCompletasPdf(int id)
    {
        var applicant = await FullQuery().AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        if (applicant is null) return NotFound();
        try
        {
            var bytes = _pdfBuilder.BuildCombinado(ToApplicantDto(applicant));
            return File(bytes, PdfContentType, $"{FileLabel(applicant)} - Inscripcion.pdf");
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status409Conflict, title: "Nada que imprimir todavía");
        }
    }

    /// <summary>"Imprimir todas" — mismos filtros que GetAll, un PDF combinado por aspirante, todos en un solo archivo.</summary>
    [HttpGet("ficha-batch.pdf")]
    [EnableRateLimiting(RateLimitPolicies.Pesado)]
    public async Task<IActionResult> GetBatchPdf([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? estado)
    {
        var applicants = await FullQuery().AsNoTracking().Where(a => a.MigradoStudentId == null).ToListAsync();
        var filtered = applicants
            .Where(a => !from.HasValue || DateOnly.FromDateTime(a.CreatedAt) >= from.Value)
            .Where(a => !to.HasValue || DateOnly.FromDateTime(a.CreatedAt) <= to.Value)
            .Where(a =>
            {
                var completa = a.Preinscripcion is not null && a.AsignacionNuevoIngreso is not null && a.CartaCompromiso is not null;
                return estado switch
                {
                    "completa" => completa,
                    "pendiente" => !completa,
                    _ => true,
                };
            })
            .OrderBy(a => a.CreatedAt)
            .ToList();

        if (filtered.Count == 0) return NotFound("No hay inscripciones para ese rango/filtro.");

        try
        {
            var bytes = _pdfBuilder.BuildBatchCombinado(filtered.Select(ToApplicantDto).ToList());
            return File(bytes, PdfContentType, "Inscripciones.pdf");
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status409Conflict, title: "Nada que imprimir");
        }
    }

    private static string FileLabel(Applicant a)
    {
        var label = $"{a.Id} - {DisplayNombre(a)}";
        return string.Concat(label.Select(ch => Path.GetInvalidFileNameChars().Contains(ch) ? '_' : ch));
    }
}
