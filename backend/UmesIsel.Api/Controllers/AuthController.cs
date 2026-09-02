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
/// Acceso al portal. Dos puertas distintas, a propósito:
///
/// · <c>/login/estudiante</c> — carné + correo institucional.
/// · <c>/login/admin</c> — cuenta nombrada + contraseña, con bloqueo por intentos.
///
/// Antes había una sola caja de texto que aceptaba "un carné o el código de
/// admin". Eso significaba que la misma petición podía acabar en el panel
/// administrativo, y que probar valores al azar tenía como premio mayor el
/// control total. Separarlas permite ponerle a cada una el límite y el registro
/// que le corresponde.
///
/// Las dos responden EXACTAMENTE el mismo mensaje cuando fallan, sin decir si lo
/// que no existía era el usuario o la contraseña: si el mensaje distinguiera,
/// serviría para averiguar qué carnés y qué cuentas existen.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    /// <summary>Tras estos fallos seguidos, la cuenta de admin se bloquea un rato.</summary>
    private const int MaxIntentosAdmin = 5;
    private static readonly TimeSpan DuracionBloqueo = TimeSpan.FromMinutes(15);

    private const string CredencialesInvalidas =
        "Los datos no coinciden con ninguna cuenta. Revísalos e intenta de nuevo.";

    private readonly IselDbContext _db;
    private readonly SessionTokenService _tokens;
    private readonly AuditService _audit;
    private readonly CurrentUser _currentUser;

    public AuthController(IselDbContext db, SessionTokenService tokens, AuditService audit, CurrentUser currentUser)
    {
        _db = db;
        _tokens = tokens;
        _audit = audit;
        _currentUser = currentUser;
    }

    // ------------------------------------------------------------- alumnos

    /// <summary>POST /api/auth/login/estudiante — carné + correo institucional.</summary>
    [HttpPost("login/estudiante")]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    public async Task<ActionResult<LoginResponse>> LoginEstudiante(StudentLoginRequest request)
    {
        var carnet = (request.Carnet ?? string.Empty).Trim();
        var correo = (request.CorreoInstitucional ?? string.Empty).Trim();

        if (carnet.Length == 0 || correo.Length == 0)
        {
            return BadRequest("Escribe tu carné y tu correo institucional.");
        }

        var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Carnet == carnet);

        // Se comprueban las dos cosas a la vez y se responde igual en todos los
        // casos: un carné inexistente y un correo equivocado son la misma
        // respuesta, para no confirmar qué carnés están dados de alta.
        if (student is null || !CorreoCoincide(student.CorreoInstitucional, correo))
        {
            await _audit.LogAsync(SecurityEventTypes.LoginAlumnoFallido, $"carné {Sanitizar(carnet)}", actor: "anónimo", esAlerta: true);
            return Unauthorized(CredencialesInvalidas);
        }

        var (token, expires) = _tokens.Issue(SessionRole.Student, student.Id, student.Carnet);
        await _audit.LogAsync(SecurityEventTypes.LoginAlumnoOk, actor: $"alumno:{student.Carnet}");

        var documentos = await _db.StudentDocuments.CountAsync(d => d.StudentId == student.Id);
        return Ok(new LoginResponse("student", token, expires, ToStudentDto(student, documentos), null));
    }

    /// <summary>
    /// Compara correos institucionales con tolerancia a lo que de verdad teclea
    /// la gente: mayúsculas, espacios sobrantes y escribir solo la parte de
    /// antes de la arroba. No tolera un dominio distinto: el correo personal no
    /// sirve para entrar, porque es el que sí anda escrito en cualquier lado.
    /// </summary>
    private static bool CorreoCoincide(string? registrado, string escrito)
    {
        if (string.IsNullOrWhiteSpace(registrado)) return false;

        var esperado = Normalizar(registrado);
        var recibido = Normalizar(escrito);
        if (esperado.Length == 0) return false;
        if (esperado == recibido) return true;

        // "barahonaanderson" vale por "barahonaanderson@umes.edu.gt".
        var arroba = esperado.IndexOf('@');
        return arroba > 0 && recibido == esperado[..arroba];
    }

    /// <summary>
    /// Minúsculas y sin los caracteres invisibles que traía el Excel de origen
    /// (marcas de dirección de texto pegadas delante de algunos correos). Sin
    /// esto, esos alumnos no podrían entrar nunca y el motivo sería invisible.
    /// </summary>
    private static string Normalizar(string value) =>
        new string(value.Where(c => !char.IsControl(c) && c is not ('​' or '‌' or '‍' or '‎' or '‏' or '﻿')).ToArray())
            .Trim()
            .ToLowerInvariant();

    // -------------------------------------------------------------- admin

    /// <summary>POST /api/auth/login/admin — usuario + contraseña.</summary>
    [HttpPost("login/admin")]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    public async Task<ActionResult<LoginResponse>> LoginAdmin(AdminLoginRequest request)
    {
        var username = (request.Username ?? string.Empty).Trim().ToLowerInvariant();
        var password = request.Password ?? string.Empty;

        if (username.Length == 0 || password.Length == 0)
        {
            return BadRequest("Escribe tu usuario y tu contraseña.");
        }

        var cuenta = await _db.AdminUsers.FirstOrDefaultAsync(a => a.Username == username);
        var ahora = DateTime.UtcNow;

        if (cuenta is not null && cuenta.BloqueadaHasta is not null && cuenta.BloqueadaHasta > ahora)
        {
            var minutos = Math.Max(1, (int)Math.Ceiling((cuenta.BloqueadaHasta.Value - ahora).TotalMinutes));
            await _audit.LogAsync(SecurityEventTypes.LoginAdminBloqueado, $"cuenta {username}", actor: "anónimo", esAlerta: true);
            return StatusCode(StatusCodes.Status429TooManyRequests,
                $"Demasiados intentos fallidos. Vuelve a intentarlo en {minutos} minuto{(minutos == 1 ? "" : "s")}.");
        }

        // Si la cuenta no existe se verifica igual contra un hash de mentira. Sin
        // esto, un usuario inexistente respondería en microsegundos y uno real
        // tardaría lo que tarda PBKDF2, y esa diferencia de tiempo delata qué
        // cuentas existen.
        var valida = cuenta is not null && cuenta.Activo && PasswordHasher.Verify(password, cuenta.PasswordHash);
        if (cuenta is null)
        {
            PasswordHasher.Verify(password, HashSeñuelo.Value);
        }

        if (!valida)
        {
            if (cuenta is not null && cuenta.Activo)
            {
                cuenta.IntentosFallidos++;
                if (cuenta.IntentosFallidos >= MaxIntentosAdmin)
                {
                    cuenta.BloqueadaHasta = ahora.Add(DuracionBloqueo);
                    cuenta.IntentosFallidos = 0;
                }
                cuenta.UpdatedAt = ahora;
                await _db.SaveChangesAsync();
            }
            await _audit.LogAsync(SecurityEventTypes.LoginAdminFallido, $"cuenta {username}", actor: "anónimo", esAlerta: true);
            return Unauthorized(CredencialesInvalidas);
        }

        cuenta!.IntentosFallidos = 0;
        cuenta.BloqueadaHasta = null;
        cuenta.UltimoAcceso = ahora;
        cuenta.UpdatedAt = ahora;
        await _db.SaveChangesAsync();

        var (token, expires) = _tokens.Issue(SessionRole.Admin, cuenta.Id, cuenta.Username);
        await _audit.LogAsync(SecurityEventTypes.LoginAdminOk, actor: $"admin:{cuenta.Username}");

        return Ok(new LoginResponse("admin", token, expires, null, ToAdminDto(cuenta)));
    }

    /// <summary>
    /// Hash de una contraseña que nadie tiene, para gastar el mismo tiempo de
    /// CPU cuando el usuario no existe. Se calcula una sola vez.
    /// </summary>
    private static readonly Lazy<string> HashSeñuelo =
        new(() => PasswordHasher.Hash(Guid.NewGuid().ToString("N")));

    // ------------------------------------------------------------- sesión

    /// <summary>
    /// GET /api/auth/yo — quién soy según el token. El frontend lo llama al
    /// arrancar para saber si la sesión que tiene guardada sigue viva, en vez de
    /// fiarse de lo que dejó en el navegador la última vez.
    /// </summary>
    [HttpGet("yo")]
    [RequireSession]
    public async Task<ActionResult<LoginResponse>> Yo()
    {
        if (_currentUser.IsAdmin)
        {
            var cuenta = await _db.AdminUsers.AsNoTracking().FirstOrDefaultAsync(a => a.Id == _currentUser.SubjectId);
            if (cuenta is null) return Unauthorized(CredencialesInvalidas);
            return Ok(new LoginResponse("admin", string.Empty, DateTimeOffset.MinValue, null, ToAdminDto(cuenta)));
        }

        if (_currentUser.IsStudent)
        {
            var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == _currentUser.SubjectId);
            if (student is null) return Unauthorized(CredencialesInvalidas);
            var documentos = await _db.StudentDocuments.CountAsync(d => d.StudentId == student.Id);
            return Ok(new LoginResponse("student", string.Empty, DateTimeOffset.MinValue, ToStudentDto(student, documentos), null));
        }

        return Ok(new LoginResponse("applicant", string.Empty, DateTimeOffset.MinValue, null, null));
    }

    /// <summary>PUT /api/auth/password — cambiar la propia contraseña.</summary>
    [HttpPut("password")]
    [RequireAdmin]
    public async Task<IActionResult> CambiarPassword(CambiarPasswordRequest request)
    {
        var cuenta = await _db.AdminUsers.FirstOrDefaultAsync(a => a.Id == _currentUser.SubjectId);
        if (cuenta is null) return Unauthorized(CredencialesInvalidas);

        if (!PasswordHasher.Verify(request.PasswordActual ?? string.Empty, cuenta.PasswordHash))
        {
            await _audit.LogAsync(SecurityEventTypes.LoginAdminFallido, "cambio de contraseña con la actual equivocada", esAlerta: true);
            return BadRequest("La contraseña actual no es correcta.");
        }

        var motivo = PasswordHasher.ValidatePolicy(request.PasswordNueva);
        if (motivo is not null) return BadRequest(motivo);

        if (PasswordHasher.Verify(request.PasswordNueva, cuenta.PasswordHash))
        {
            return BadRequest("La contraseña nueva tiene que ser distinta de la actual.");
        }

        cuenta.PasswordHash = PasswordHasher.Hash(request.PasswordNueva);
        cuenta.DebeCambiarPassword = false;
        cuenta.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(SecurityEventTypes.PasswordCambiada);
        return NoContent();
    }

    internal static AdminUserDto ToAdminDto(AdminUser a) =>
        new(a.Id, a.Username, a.NombreCompleto, a.Activo, a.DebeCambiarPassword, a.UltimoAcceso);

    private static StudentDto ToStudentDto(Student s, int documentosSubidos) => new(
        s.Id, s.Carnet, s.PrimerApellido, s.SegundoApellido, s.PrimerNombre, s.SegundoNombre,
        s.NombreCompleto, s.Carrera, s.Seccion, s.Trimestre, s.CorreoInstitucional, s.CorreoPersonal,
        s.Celular, s.PapeleriaEnOrden, documentosSubidos);

    /// <summary>Deja solo lo imprimible antes de escribirlo en la bitácora, para que nadie inyecte saltos de línea en el registro.</summary>
    private static string Sanitizar(string value) =>
        new string(value.Where(c => !char.IsControl(c)).Take(40).ToArray());
}
