namespace UmesIsel.Api.Services;

/// <summary>
/// Guarda en disco los PDFs que sube un aspirante (carta de compromiso) o un alumno ya asignado
/// (papelería al día) — un archivo por (dueño, tipo de documento), bajo
/// <c>App_Data/uploads/{scope}/{ownerId}/{tipo}.pdf</c>. Nunca se commitea (ver .gitignore).
/// </summary>
public class DocumentStorageService
{
    private const long MaxSizeBytes = 10 * 1024 * 1024;
    private readonly string _root;

    public DocumentStorageService(IWebHostEnvironment env)
    {
        _root = Path.Combine(env.ContentRootPath, "App_Data", "uploads");
    }

    /// <summary>Lanza <see cref="InvalidOperationException"/> con un mensaje en español listo para mostrar si el archivo no sirve.</summary>
    public static void ValidatePdf(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            throw new InvalidOperationException("Selecciona un archivo.");
        }
        if (file.Length > MaxSizeBytes)
        {
            throw new InvalidOperationException("El archivo supera los 10 MB permitidos.");
        }
        var ext = Path.GetExtension(file.FileName);
        var looksLikePdf =
            string.Equals(ext, ".pdf", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(file.ContentType, "application/pdf", StringComparison.OrdinalIgnoreCase);
        if (!looksLikePdf)
        {
            throw new InvalidOperationException("Solo se aceptan archivos en PDF.");
        }
    }

    public async Task<(string FilePath, string FileName, long SizeBytes)> SaveAsync(string scope, string ownerId, string tipo, IFormFile file)
    {
        var dir = Path.Combine(_root, scope, ownerId);
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, $"{tipo}.pdf");
        await using (var stream = File.Create(path))
        {
            await file.CopyToAsync(stream);
        }
        return (path, file.FileName, file.Length);
    }

    public void Delete(string scope, string ownerId, string tipo)
    {
        var path = Path.Combine(_root, scope, ownerId, $"{tipo}.pdf");
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }
}
