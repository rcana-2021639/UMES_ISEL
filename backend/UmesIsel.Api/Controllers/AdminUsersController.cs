using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;
using UmesIsel.Api.Security;
using UmesIsel.Api.Services;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// Gestión de las cuentas del panel: darlas de alta, desactivarlas y reiniciar
/// contraseñas.
///
/// Dos salvaguardas que evitan quedarse fuera de la propia aplicación:
/// no se puede desactivar ni borrar la última cuenta activa, y nadie puede
/// desactivarse a sí mismo.
/// </summary>
[ApiController]
[Route("api/admin/usuarios")]
[RequireAdmin]
public class AdminUsersController : ControllerBase
{
    private readonly IselDbContext _db;
    private readonly AuditService _audit;
    private readonly CurrentUser _currentUser;

    public AdminUsersController(IselDbContext db, AuditService audit, CurrentUser currentUser)
    {
        _db = db;
        _audit = audit;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminUserDto>>> GetAll()
    {
        var cuentas = await _db.AdminUsers.AsNoTracking().OrderBy(a => a.Username).ToListAsync();
        return Ok(cuentas.Select(AuthController.ToAdminDto).ToList());
    }

    /// <summary>
    /// Crea una cuenta. Si no se manda contraseña, se genera una temporal y se
    /// devuelve UNA sola vez para que quien la crea se la pase a su dueño; nace
    /// marcada para cambiarse en el primer acceso.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ResetPasswordResponse>> Crear(AdminUserCreateRequest request)
    {
        var username = (request.Username ?? string.Empty).Trim().ToLowerInvariant();
        if (username.Length < 3 || username.Length > 60)
        {
            return BadRequest("El usuario debe tener entre 3 y 60 caracteres.");
        }
        if (!username.All(c => char.IsLetterOrDigit(c) || c is '.' or '_' or '-'))
        {
            return BadRequest("El usuario solo puede llevar letras, números, punto, guion y guion bajo.");
        }
        if (string.IsNullOrWhiteSpace(request.NombreCompleto))
        {
            return BadRequest("El nombre completo es obligatorio.");
        }
        if (await _db.AdminUsers.AnyAsync(a => a.Username == username))
        {
            return Conflict("Ya existe una cuenta con ese usuario.");
        }

        var temporal = string.IsNullOrWhiteSpace(request.Password);
        var password = temporal ? PasswordHasher.GenerateReadablePassword() : request.Password!;

        var motivo = PasswordHasher.ValidatePolicy(password);
        if (motivo is not null) return BadRequest(motivo);

        var now = DateTime.UtcNow;
        _db.AdminUsers.Add(new AdminUser
        {
            Username = username,
            NombreCompleto = request.NombreCompleto.Trim(),
            PasswordHash = PasswordHasher.Hash(password),
            Activo = true,
            DebeCambiarPassword = true,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await _db.SaveChangesAsync();

        await _audit.LogAsync(SecurityEventTypes.AdminCreado, $"cuenta {username}");
        return Ok(new ResetPasswordResponse(password));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<AdminUserDto>> Actualizar(int id, AdminUserUpdateRequest request)
    {
        var cuenta = await _db.AdminUsers.FirstOrDefaultAsync(a => a.Id == id);
        if (cuenta is null) return NotFound();

        if (!request.Activo)
        {
            if (cuenta.Id == _currentUser.SubjectId)
            {
                return BadRequest("No puedes desactivar tu propia cuenta.");
            }
            var activasRestantes = await _db.AdminUsers.CountAsync(a => a.Activo && a.Id != id);
            if (activasRestantes == 0)
            {
                return BadRequest("Es la única cuenta activa: desactivarla dejaría el panel sin acceso.");
            }
        }

        cuenta.NombreCompleto = (request.NombreCompleto ?? cuenta.NombreCompleto).Trim();
        cuenta.Activo = request.Activo;
        // Reactivar limpia el bloqueo por intentos: si no, la cuenta volvería
        // "activa" pero sin poder entrar hasta que caducara el castigo.
        if (request.Activo)
        {
            cuenta.BloqueadaHasta = null;
            cuenta.IntentosFallidos = 0;
        }
        cuenta.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(SecurityEventTypes.AdminModificado,
            $"cuenta {cuenta.Username} — {(request.Activo ? "activada" : "desactivada")}", esAlerta: !request.Activo);
        return Ok(AuthController.ToAdminDto(cuenta));
    }

    /// <summary>Genera una contraseña temporal nueva. Se devuelve una sola vez y hay que cambiarla al entrar.</summary>
    [HttpPost("{id:int}/reset-password")]
    public async Task<ActionResult<ResetPasswordResponse>> ResetPassword(int id)
    {
        var cuenta = await _db.AdminUsers.FirstOrDefaultAsync(a => a.Id == id);
        if (cuenta is null) return NotFound();

        var temporal = PasswordHasher.GenerateReadablePassword();
        cuenta.PasswordHash = PasswordHasher.Hash(temporal);
        cuenta.DebeCambiarPassword = true;
        cuenta.IntentosFallidos = 0;
        cuenta.BloqueadaHasta = null;
        cuenta.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(SecurityEventTypes.PasswordCambiada, $"reinicio de la cuenta {cuenta.Username}", esAlerta: true);
        return Ok(new ResetPasswordResponse(temporal));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var cuenta = await _db.AdminUsers.FirstOrDefaultAsync(a => a.Id == id);
        if (cuenta is null) return NotFound();

        if (cuenta.Id == _currentUser.SubjectId)
        {
            return BadRequest("No puedes eliminar tu propia cuenta.");
        }
        if (await _db.AdminUsers.CountAsync(a => a.Activo && a.Id != id) == 0)
        {
            return BadRequest("Es la única cuenta activa: eliminarla dejaría el panel sin acceso.");
        }

        _db.AdminUsers.Remove(cuenta);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(SecurityEventTypes.RegistroEliminado, $"cuenta de admin {cuenta.Username}", esAlerta: true);
        return NoContent();
    }

    /// <summary>
    /// GET /api/admin/usuarios/bitacora — los últimos sucesos de seguridad.
    /// Es donde se ve un ataque de fuerza bruta en curso: una ráfaga de
    /// "login.*.fallido" desde la misma dirección.
    /// </summary>
    [HttpGet("/api/admin/bitacora")]
    public async Task<ActionResult<IReadOnlyList<SecurityEventDto>>> Bitacora(
        [FromQuery] bool soloAlertas = false, [FromQuery] int limite = 200)
    {
        var query = _db.SecurityEvents.AsNoTracking().AsQueryable();
        if (soloAlertas) query = query.Where(e => e.EsAlerta);

        var eventos = await query
            .OrderByDescending(e => e.OcurridoEn)
            .Take(Math.Clamp(limite, 1, 1000))
            .ToListAsync();

        return Ok(eventos
            .Select(e => new SecurityEventDto(e.Id, e.OcurridoEn, e.Tipo, e.Actor, e.Ip, e.Detalle, e.EsAlerta))
            .ToList());
    }
}
