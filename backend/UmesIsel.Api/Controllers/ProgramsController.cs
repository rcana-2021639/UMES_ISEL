using Microsoft.AspNetCore.Mvc;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models;

namespace UmesIsel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProgramsController : ControllerBase
{
    /// <summary>GET /api/programs — the full list, used by the "Programas" grid.</summary>
    [HttpGet]
    public ActionResult<IReadOnlyList<MasterProgram>> GetAll()
    {
        return Ok(IselSeedData.Programs);
    }

    /// <summary>GET /api/programs/{slug} — a single program, used by the "Información" detail page.</summary>
    [HttpGet("{slug}")]
    public ActionResult<MasterProgram> GetBySlug(string slug)
    {
        var program = IselSeedData.Programs.FirstOrDefault(p =>
            p.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));

        return program is null ? NotFound() : Ok(program);
    }
}
