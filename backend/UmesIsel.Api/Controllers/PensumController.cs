using Microsoft.AspNetCore.Mvc;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Security;
using UmesIsel.Api.Services;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// La pestaña "Pénsum" del panel de admin: crear, renombrar, archivar y borrar
/// carreras, y editar el pénsum de cada una trimestre por trimestre.
///
/// Lo que se guarde aquí es lo que ven inmediatamente los tres trámites
/// (asignación, inscripción y solicitud de título), porque los tres leen de
/// esta misma tabla — no hay una segunda copia del pénsum en ningún lado.
///
/// Todo lo que escribe exige una sesión de administrador (ver
/// <see cref="RequireAdminAttribute"/>): borrar el pénsum entero no puede quedar
/// a un DELETE de distancia para cualquiera.
/// </summary>
[ApiController]
[Route("api/pensum")]
public class PensumController : ControllerBase
{
    private readonly PensumService _pensum;

    public PensumController(PensumService pensum) => _pensum = pensum;

    private ActionResult Fail(PensumError error) => StatusCode(error.Status, error.Message);

    /// <summary>GET /api/pensum — el árbol completo (carreras, trimestres, cursos y uso), para la pestaña de admin.</summary>
    [HttpGet]
    [RequireAdmin]
    public async Task<ActionResult<IReadOnlyList<PensumCarreraDto>>> GetPensum()
        => Ok(await _pensum.GetPensumAsync());

    /// <summary>
    /// GET /api/pensum/carreras?soloProgramas=true — la lista para los selectores
    /// de carrera de los formularios públicos. Es pública a propósito: el
    /// aspirante que aún no tiene carné necesita ver en qué puede inscribirse.
    /// </summary>
    [HttpGet("carreras")]
    [AllowAnonymousAccess]
    public async Task<ActionResult<IReadOnlyList<CarreraOpcionDto>>> GetCarreras([FromQuery] bool soloProgramas = true)
        => Ok(await _pensum.GetOpcionesAsync(soloProgramas));

    [HttpPost("carreras")]
    [RequireAdmin]
    public async Task<ActionResult<PensumCarreraDto>> CrearCarrera(CarreraUpsertRequest request)
    {
        var (_, error) = await _pensum.CrearCarreraAsync(request);
        return error is not null ? Fail(error) : Ok(await _pensum.GetPensumAsync());
    }

    /// <summary>
    /// PUT /api/pensum/carreras/{id} — nombre, tipo y estado. Cambiar el nombre
    /// lo arrastra a los alumnos, fichas y expedientes que la usan; si no, se
    /// quedarían apuntando a una carrera que ya no existe.
    /// </summary>
    [HttpPut("carreras/{id:int}")]
    [RequireAdmin]
    public async Task<ActionResult<IReadOnlyList<PensumCarreraDto>>> ActualizarCarrera(int id, CarreraUpsertRequest request)
    {
        var (_, error) = await _pensum.ActualizarCarreraAsync(id, request);
        return error is not null ? Fail(error) : Ok(await _pensum.GetPensumAsync());
    }

    /// <summary>DELETE /api/pensum/carreras/{id} — solo si nadie la usa; si la usan, responde 409 y sugiere archivarla.</summary>
    [HttpDelete("carreras/{id:int}")]
    [RequireAdmin]
    public async Task<ActionResult<IReadOnlyList<PensumCarreraDto>>> EliminarCarrera(int id)
    {
        var error = await _pensum.EliminarCarreraAsync(id);
        return error is not null ? Fail(error) : Ok(await _pensum.GetPensumAsync());
    }

    [HttpPut("carreras/orden")]
    [RequireAdmin]
    public async Task<ActionResult<IReadOnlyList<PensumCarreraDto>>> Reordenar(ReordenarCarrerasRequest request)
    {
        var error = await _pensum.ReordenarAsync(request);
        return error is not null ? Fail(error) : Ok(await _pensum.GetPensumAsync());
    }

    [HttpPost("carreras/{carreraId:int}/cursos")]
    [RequireAdmin]
    public async Task<ActionResult<IReadOnlyList<PensumCarreraDto>>> CrearCurso(int carreraId, CursoUpsertRequest request)
    {
        var (_, error) = await _pensum.CrearCursoAsync(carreraId, request);
        return error is not null ? Fail(error) : Ok(await _pensum.GetPensumAsync());
    }

    [HttpPut("cursos/{cursoId:int}")]
    [RequireAdmin]
    public async Task<ActionResult<IReadOnlyList<PensumCarreraDto>>> ActualizarCurso(int cursoId, CursoUpsertRequest request)
    {
        var (_, error) = await _pensum.ActualizarCursoAsync(cursoId, request);
        return error is not null ? Fail(error) : Ok(await _pensum.GetPensumAsync());
    }

    [HttpDelete("cursos/{cursoId:int}")]
    [RequireAdmin]
    public async Task<ActionResult<IReadOnlyList<PensumCarreraDto>>> EliminarCurso(int cursoId)
    {
        var error = await _pensum.EliminarCursoAsync(cursoId);
        return error is not null ? Fail(error) : Ok(await _pensum.GetPensumAsync());
    }

    [HttpDelete("carreras/{carreraId:int}/trimestres/{trimestre:int}")]
    [RequireAdmin]
    public async Task<ActionResult<IReadOnlyList<PensumCarreraDto>>> EliminarTrimestre(int carreraId, int trimestre)
    {
        var error = await _pensum.EliminarTrimestreAsync(carreraId, trimestre);
        return error is not null ? Fail(error) : Ok(await _pensum.GetPensumAsync());
    }
}
