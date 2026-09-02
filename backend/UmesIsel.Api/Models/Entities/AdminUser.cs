using System.ComponentModel.DataAnnotations;

namespace UmesIsel.Api.Models.Entities;

/// <summary>
/// Una cuenta del panel administrativo.
///
/// Sustituye al código único compartido que antes vivía en <c>appsettings.json</c>
/// (y por tanto en el repositorio, y por tanto en la máquina de cualquiera que
/// clonara el proyecto). Con cuentas nombradas se sabe quién borró una ficha, y
/// se le puede quitar el acceso a una persona sin cambiarle la contraseña a
/// todas las demás.
///
/// La contraseña se guarda solo como hash PBKDF2 — ver <see cref="Security.PasswordHasher"/> —
/// y nunca sale de aquí: no hay ningún DTO que la exponga.
/// </summary>
public class AdminUser
{
    public int Id { get; set; }

    /// <summary>Con el que se entra. Se compara en minúsculas para que no dependa de cómo lo teclee.</summary>
    [MaxLength(60)]
    public string Username { get; set; } = string.Empty;

    [MaxLength(120)]
    public string NombreCompleto { get; set; } = string.Empty;

    [MaxLength(300)]
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>Desactivar en vez de borrar: se conserva quién hizo qué en el registro de auditoría.</summary>
    public bool Activo { get; set; } = true;

    /// <summary>
    /// Obliga a cambiarla al entrar. Se marca en las cuentas que crea otro admin
    /// (y en la primera que genera el sistema): una contraseña que un tercero
    /// tecleó o leyó en un log no debería seguir siendo válida mucho tiempo.
    /// </summary>
    public bool DebeCambiarPassword { get; set; }

    /// <summary>Intentos fallidos seguidos. Ver <see cref="BloqueadaHasta"/>.</summary>
    public int IntentosFallidos { get; set; }

    /// <summary>
    /// Bloqueo temporal tras varios intentos fallidos seguidos. Es lo que hace
    /// que probar contraseñas a mano no sirva de nada, incluso si el atacante
    /// rota su IP y esquiva el límite por dirección.
    /// </summary>
    public DateTime? BloqueadaHasta { get; set; }

    public DateTime? UltimoAcceso { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
