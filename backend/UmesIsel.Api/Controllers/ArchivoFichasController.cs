using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;
using UmesIsel.Api.Security;
using UmesIsel.Api.Services;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// Reinicio de asignaciones y el archivo de fichas que va dejando. Ver <see cref="ArchivoFichasService"/>.
/// </summary>
[ApiController]
[Route("api/archivo-fichas")]
[RequireAdmin]
public class ArchivoFichasController : ControllerBase
{
    /// <summary>
    /// La palabra que hay que escribir en la segunda alerta. Se comprueba también aquí: el panel ya
    /// la exige, pero así una petición suelta —o un botón mal cableado el día de mañana— no puede
    /// vaciar las asignaciones sin esa confirmación.
    /// </summary>
    private const string PalabraConfirmacion = "REINICIAR";

    private readonly IselDbContext _db;
    private readonly ArchivoFichasService _archivo;
    private readonly CurrentUser _currentUser;
    private readonly AuditService _audit;

    public ArchivoFichasController(IselDbContext db, ArchivoFichasService archivo, CurrentUser currentUser, AuditService audit)
    {
        _db = db;
        _archivo = archivo;
        _currentUser = currentUser;
        _audit = audit;
    }

    private ArchivoFichasDto ToDto(ArchivoFichas a) => new(
        a.Id, a.Etiqueta, a.Estado, a.CantidadFichas, a.Bytes, a.Error, a.CreadoPor, a.CreadoEn, a.TerminadoEn,
        a.Estado == EstadosArchivoFichas.Listo && _archivo.RutaDe(a) is not null);

    /// <summary>GET /api/archivo-fichas — los archivos, del más reciente al más viejo.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ArchivoFichasDto>>> Listar()
    {
        var archivos = await _db.ArchivosFichas.AsNoTracking().OrderByDescending(a => a.CreadoEn).ToListAsync();
        return Ok(archivos.Select(ToDto).ToList());
    }

    /// <summary>GET /api/archivo-fichas/resumen — lo que se llevaría un reinicio ahora, para las alertas.</summary>
    [HttpGet("resumen")]
    public async Task<ActionResult<ResumenReinicioDto>> Resumen()
    {
        var total = await _db.CourseAssignments.CountAsync();
        var impresas = await _db.CourseAssignments.CountAsync(ca => ca.ImpresaEn != null);
        var enCurso = await _db.ArchivosFichas.AnyAsync(a => a.Estado == EstadosArchivoFichas.Generando);
        return Ok(new ResumenReinicioDto(total, impresas, total - impresas, enCurso));
    }

    /// <summary>POST /api/archivo-fichas/reiniciar — archiva todas las fichas en un ZIP y las borra.</summary>
    [HttpPost("reiniciar")]
    public async Task<ActionResult<ArchivoFichasDto>> Reiniciar(ReiniciarAsignacionesRequest request)
    {
        if (!string.Equals(request.Confirmacion?.Trim(), PalabraConfirmacion, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest($"Para reiniciar hay que escribir {PalabraConfirmacion}.");
        }

        var etiqueta = string.IsNullOrWhiteSpace(request.Etiqueta)
            ? $"Asignaciones hasta el {DateTime.UtcNow.AddHours(-6):dd/MM/yyyy}"
            : request.Etiqueta.Trim();
        if (etiqueta.Length > 120) etiqueta = etiqueta[..120];

        try
        {
            var archivo = await _archivo.IniciarAsync(_db, etiqueta, _currentUser.Display);
            return Ok(ToDto(archivo));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }

    /// <summary>GET /api/archivo-fichas/{id}/descargar — el ZIP con los PDF de las fichas.</summary>
    [HttpGet("{id:int}/descargar")]
    public async Task<IActionResult> Descargar(int id)
    {
        var archivo = await _db.ArchivosFichas.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        if (archivo is null) return NotFound();
        var ruta = _archivo.RutaDe(archivo);
        if (ruta is null) return NotFound("El ZIP de este archivo no está en el servidor.");

        await _audit.LogAsync(SecurityEventTypes.DatosExportados, $"descarga del archivo de fichas «{archivo.Etiqueta}»");
        var nombre = $"Fichas - {string.Concat(archivo.Etiqueta.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c))}.zip";
        return PhysicalFile(ruta, "application/zip", nombre);
    }
}
