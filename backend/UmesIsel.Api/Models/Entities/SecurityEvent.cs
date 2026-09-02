using System.ComponentModel.DataAnnotations;

namespace UmesIsel.Api.Models.Entities;

/// <summary>Tipos de suceso que se registran. Constantes y no un enum, para poder añadir sin migrar.</summary>
public static class SecurityEventTypes
{
    public const string LoginAdminOk = "login.admin.ok";
    public const string LoginAdminFallido = "login.admin.fallido";
    public const string LoginAdminBloqueado = "login.admin.bloqueado";
    public const string LoginAlumnoOk = "login.alumno.ok";
    public const string LoginAlumnoFallido = "login.alumno.fallido";
    public const string AccesoInscripcion = "acceso.inscripcion";
    public const string AccesoTitulo = "acceso.titulo";
    public const string AccesoTituloFallido = "acceso.titulo.fallido";
    public const string AdminCreado = "admin.creado";
    public const string AdminModificado = "admin.modificado";
    public const string PasswordCambiada = "admin.password.cambiada";
    public const string RegistroEliminado = "registro.eliminado";
    public const string DatosExportados = "datos.exportados";
    public const string DatosImportados = "datos.importados";
    public const string PensumModificado = "pensum.modificado";
    public const string RespaldoCreado = "respaldo.creado";
    public const string RespaldoDescargado = "respaldo.descargado";
}

/// <summary>
/// Bitácora de seguridad: quién hizo qué, desde dónde y cuándo.
///
/// Existe por dos razones muy concretas. La primera es forense: si un día
/// aparecen fichas borradas, la pregunta "¿quién y cuándo?" tiene que tener
/// respuesta, y sin esto no la tiene. La segunda es de detección: una ráfaga de
/// <c>login.*.fallido</c> desde la misma dirección es un ataque de fuerza bruta
/// en curso, y es visible en la propia pantalla del panel.
///
/// Regla estricta: aquí NUNCA se escribe una contraseña, un token ni un dato
/// personal más allá del identificador con el que se intentó entrar. Un registro
/// de auditoría que filtra datos es peor que no tenerlo.
/// </summary>
public class SecurityEvent
{
    public int Id { get; set; }

    public DateTime OcurridoEn { get; set; } = DateTime.UtcNow;

    [MaxLength(60)]
    public string Tipo { get; set; } = string.Empty;

    /// <summary>Quién: "admin:mrodriguez", "alumno:2026101534", o "anónimo".</summary>
    [MaxLength(120)]
    public string Actor { get; set; } = string.Empty;

    /// <summary>Desde dónde. Puede venir vacía si la aplicación está detrás de un proxy mal configurado.</summary>
    [MaxLength(64)]
    public string? Ip { get; set; }

    /// <summary>Qué pasó, en una línea. Sin datos sensibles.</summary>
    [MaxLength(400)]
    public string? Detalle { get; set; }

    /// <summary>Marca los sucesos que merecen mirarse (fallos, bloqueos, borrados).</summary>
    public bool EsAlerta { get; set; }
}
