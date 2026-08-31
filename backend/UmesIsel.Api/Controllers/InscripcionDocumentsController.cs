using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;
using UmesIsel.Api.Services;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// Documentos en PDF que un aspirante sube para su carta de compromiso — opcional, uno a la vez
/// (subir solo el DPI porque es lo único que faltaba no debería obligar a resubir todo lo demás).
/// </summary>
[ApiController]
[Route("api/inscripciones/{applicantId:int}/documentos")]
public class InscripcionDocumentsController : ControllerBase
{
    private readonly IselDbContext _db;
    private readonly DocumentStorageService _storage;

    public InscripcionDocumentsController(IselDbContext db, DocumentStorageService storage)
    {
        _db = db;
        _storage = storage;
    }

    private static readonly HashSet<string> TiposValidos = new(DocumentoTipos.Nacional.Concat(DocumentoTipos.Extranjero));

    private static ApplicantDocumentDto ToDto(ApplicantDocument d) => new(d.Tipo, d.FileName, d.SizeBytes, d.UploadedAt);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ApplicantDocumentDto>>> GetAll(int applicantId)
    {
        var docs = await _db.ApplicantDocuments.AsNoTracking()
            .Where(d => d.ApplicantId == applicantId)
            .ToListAsync();
        return Ok(docs.Select(ToDto).ToList());
    }

    [HttpPost("{tipo}")]
    [RequestSizeLimit(10 * 1024 * 1024 + 1024)]
    public async Task<ActionResult<ApplicantDocumentDto>> Upload(int applicantId, string tipo, IFormFile file)
    {
        if (!TiposValidos.Contains(tipo))
        {
            return BadRequest("Tipo de documento no reconocido.");
        }
        var applicant = await _db.Applicants.FindAsync(applicantId);
        if (applicant is null) return NotFound();

        try
        {
            DocumentStorageService.ValidatePdf(file);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }

        var (path, fileName, size) = await _storage.SaveAsync("inscripciones", applicantId.ToString(), tipo, file);

        var existing = await _db.ApplicantDocuments.FirstOrDefaultAsync(d => d.ApplicantId == applicantId && d.Tipo == tipo);
        var now = DateTime.UtcNow;
        if (existing is null)
        {
            existing = new ApplicantDocument { ApplicantId = applicantId, Tipo = tipo };
            _db.ApplicantDocuments.Add(existing);
        }
        existing.FilePath = path;
        existing.FileName = fileName;
        existing.ContentType = "application/pdf";
        existing.SizeBytes = size;
        existing.UploadedAt = now;
        await _db.SaveChangesAsync();

        return Ok(ToDto(existing));
    }

    [HttpDelete("{tipo}")]
    public async Task<IActionResult> Delete(int applicantId, string tipo)
    {
        var existing = await _db.ApplicantDocuments.FirstOrDefaultAsync(d => d.ApplicantId == applicantId && d.Tipo == tipo);
        if (existing is null) return NotFound();

        _storage.Delete("inscripciones", applicantId.ToString(), tipo);
        _db.ApplicantDocuments.Remove(existing);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{tipo}/archivo")]
    public async Task<IActionResult> Download(int applicantId, string tipo)
    {
        var doc = await _db.ApplicantDocuments.AsNoTracking()
            .FirstOrDefaultAsync(d => d.ApplicantId == applicantId && d.Tipo == tipo);
        if (doc is null || !System.IO.File.Exists(doc.FilePath)) return NotFound();
        return PhysicalFile(doc.FilePath, "application/pdf", doc.FileName);
    }
}
