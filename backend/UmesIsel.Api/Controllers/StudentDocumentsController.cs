using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;
using UmesIsel.Api.Security;
using UmesIsel.Api.Services;

namespace UmesIsel.Api.Controllers;

/// <summary>
/// "Papelería al día" — el mismo checklist opcional de documentos de la carta de compromiso, pero
/// para un alumno que ya está asignado (no todos tienen su expediente completo). Misma mecánica que
/// <see cref="InscripcionDocumentsController"/> (un PDF a la vez, por tipo), reutilizando
/// <see cref="DocumentStorageService"/> con un scope distinto ("students" en vez de "inscripciones").
/// </summary>
/// <summary>
/// Papelería del alumno: DPI, título de nivel medio, fotos… los archivos más
/// sensibles que guarda la aplicación.
///
/// TODAS las acciones exigen ser el propio alumno o un administrador. Antes
/// estaban abiertas: bastaba recorrer /api/students/1..N/documentos/DpiAutenticado/archivo
/// para descargarse el DPI escaneado de todo el padrón.
/// </summary>
[ApiController]
[Route("api/students/{studentId:int}/documentos")]
[RequireOwnerOrAdmin(SessionRole.Student, "studentId")]
public class StudentDocumentsController : ControllerBase
{
    private readonly IselDbContext _db;
    private readonly DocumentStorageService _storage;

    public StudentDocumentsController(IselDbContext db, DocumentStorageService storage)
    {
        _db = db;
        _storage = storage;
    }

    private static readonly HashSet<string> TiposValidos = new(DocumentoTipos.Nacional.Concat(DocumentoTipos.Extranjero));

    private static ApplicantDocumentDto ToDto(StudentDocument d) => new(d.Tipo, d.FileName, d.SizeBytes, d.UploadedAt);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ApplicantDocumentDto>>> GetAll(int studentId)
    {
        var docs = await _db.StudentDocuments.AsNoTracking().Where(d => d.StudentId == studentId).ToListAsync();
        return Ok(docs.Select(ToDto).ToList());
    }

    [HttpPost("{tipo}")]
    [RequestSizeLimit(10 * 1024 * 1024 + 1024)]
    public async Task<ActionResult<ApplicantDocumentDto>> Upload(int studentId, string tipo, IFormFile file)
    {
        if (!TiposValidos.Contains(tipo))
        {
            return BadRequest("Tipo de documento no reconocido.");
        }
        var student = await _db.Students.FindAsync(studentId);
        if (student is null) return NotFound();

        try
        {
            DocumentStorageService.ValidatePdf(file);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }

        var (path, fileName, size) = await _storage.SaveAsync("students", studentId.ToString(), tipo, file);

        var existing = await _db.StudentDocuments.FirstOrDefaultAsync(d => d.StudentId == studentId && d.Tipo == tipo);
        var now = DateTime.UtcNow;
        if (existing is null)
        {
            existing = new StudentDocument { StudentId = studentId, Tipo = tipo };
            _db.StudentDocuments.Add(existing);
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
    public async Task<IActionResult> Delete(int studentId, string tipo)
    {
        var existing = await _db.StudentDocuments.FirstOrDefaultAsync(d => d.StudentId == studentId && d.Tipo == tipo);
        if (existing is null) return NotFound();

        _storage.Delete("students", studentId.ToString(), tipo);
        _db.StudentDocuments.Remove(existing);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{tipo}/archivo")]
    public async Task<IActionResult> Download(int studentId, string tipo)
    {
        var doc = await _db.StudentDocuments.AsNoTracking().FirstOrDefaultAsync(d => d.StudentId == studentId && d.Tipo == tipo);
        if (doc is null || !System.IO.File.Exists(doc.FilePath)) return NotFound();
        return PhysicalFile(doc.FilePath, "application/pdf", doc.FileName);
    }

    /// <summary>GET /api/students/{id}/documentos/pdf — solo los documentos extra, combinados en un PDF (una hoja cada uno, ya que son PDFs subidos tal cual).</summary>
    [HttpGet("pdf")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting(RateLimitPolicies.Pesado)]
    public async Task<IActionResult> GetDocumentosPdf(int studentId)
    {
        var docs = await _db.StudentDocuments.AsNoTracking().Where(d => d.StudentId == studentId).OrderBy(d => d.Tipo).ToListAsync();
        var pdfBytesList = new List<byte[]>();
        foreach (var d in docs)
        {
            if (System.IO.File.Exists(d.FilePath))
            {
                pdfBytesList.Add(await System.IO.File.ReadAllBytesAsync(d.FilePath));
            }
        }
        if (pdfBytesList.Count == 0) return NotFound("Este alumno no tiene documentos subidos.");

        try
        {
            var merged = pdfBytesList.Count == 1 ? pdfBytesList[0] : FichaPdfBuilder.MergePdfs(pdfBytesList);
            return File(merged, "application/pdf", "Documentos.pdf");
        }
        catch (Exception)
        {
            // Estos son PDFs que subió el alumno, no generados por esta app — uno corrupto o exótico
            // puede hacer que PdfSharpCore truene; se atrapa aparte para no filtrar la traza al cliente.
            return Problem(
                detail: "Uno de los documentos subidos no se pudo combinar — puede estar dañado. Prueba descargarlo aparte, o vuelve a subirlo.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "No se pudo generar el PDF");
        }
    }
}
