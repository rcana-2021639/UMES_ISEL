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

    /// <summary>
    /// Comprueba que lo que llega es de verdad un PDF. Lanza
    /// <see cref="InvalidOperationException"/> con un mensaje en español listo
    /// para mostrar si no sirve.
    ///
    /// Antes esto miraba la extensión del nombre y el Content-Type declarado —
    /// dos cosas que las escribe quien sube el archivo, así que no prueban nada:
    /// renombrar <c>virus.html</c> a <c>dpi.pdf</c> pasaba el filtro. Ahora se
    /// leen los primeros bytes: un PDF real empieza por la firma <c>%PDF-</c>.
    ///
    /// Eso, más que el archivo se guarda fuera de la carpeta que sirve el
    /// servidor web, más la cabecera <c>X-Content-Type-Options: nosniff</c> de
    /// las respuestas, cierra el camino de "subo un HTML con script, se lo paso
    /// a alguien y se ejecuta en el dominio de la universidad".
    /// </summary>
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
        if (!string.Equals(ext, ".pdf", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Solo se aceptan archivos en PDF.");
        }

        // La firma real. Se permite un poco de basura delante porque algunos
        // generadores dejan bytes de más antes de la cabecera, y los lectores de
        // PDF los toleran; buscarla en los primeros 1024 bytes es el mismo
        // criterio que usan ellos.
        Span<byte> inicio = stackalloc byte[1024];
        int leidos;
        using (var stream = file.OpenReadStream())
        {
            leidos = stream.Read(inicio);
        }

        if (!ContienePdfHeader(inicio[..leidos]))
        {
            throw new InvalidOperationException(
                "Ese archivo no es un PDF válido. Si lo abriste y se ve bien, vuelve a guardarlo como PDF y súbelo de nuevo.");
        }
    }

    private static bool ContienePdfHeader(ReadOnlySpan<byte> bytes)
    {
        ReadOnlySpan<byte> firma = "%PDF-"u8;
        for (var i = 0; i + firma.Length <= bytes.Length; i++)
        {
            if (bytes.Slice(i, firma.Length).SequenceEqual(firma)) return true;
        }
        return false;
    }

    public async Task<(string FilePath, string FileName, long SizeBytes)> SaveAsync(string scope, string ownerId, string tipo, IFormFile file)
    {
        var path = ResolverRuta(scope, ownerId, tipo);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using (var stream = File.Create(path))
        {
            await file.CopyToAsync(stream);
        }
        // El nombre original solo se guarda para enseñárselo al admin; nunca se
        // usa como ruta. Se limpia igual: acabaría en una cabecera
        // Content-Disposition al descargar, y ahí unas comillas o un salto de
        // línea permitirían falsear el nombre del archivo o partir la cabecera.
        return (path, SanitizarNombre(file.FileName), file.Length);
    }

    public void Delete(string scope, string ownerId, string tipo)
    {
        var path = ResolverRuta(scope, ownerId, tipo);
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }

    /// <summary>
    /// Construye la ruta del archivo y se asegura de que caiga DENTRO de la
    /// carpeta de subidas.
    ///
    /// Los tres trozos que la forman ya vienen validados por quien llama (el
    /// tipo contra una lista blanca, el id es un entero de la ruta), pero esta
    /// clase no puede depender de que el siguiente que la use se acuerde: si un
    /// día llega un <c>tipo</c> como "../../appsettings", la comprobación de
    /// abajo lo corta aquí en vez de sobrescribir un archivo del servidor.
    /// </summary>
    private string ResolverRuta(string scope, string ownerId, string tipo)
    {
        var raiz = Path.GetFullPath(_root);
        var candidata = Path.GetFullPath(Path.Combine(raiz, scope, ownerId, $"{tipo}.pdf"));

        if (!candidata.StartsWith(raiz + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Ruta de documento no válida.");
        }
        return candidata;
    }

    /// <summary>Deja el nombre original en algo seguro de mostrar y de poner en una cabecera HTTP.</summary>
    private static string SanitizarNombre(string? fileName)
    {
        var limpio = Path.GetFileName(fileName ?? string.Empty);
        limpio = new string(limpio.Where(c => !char.IsControl(c) && c != '"' && c != '\\').ToArray()).Trim();
        if (limpio.Length > 120) limpio = limpio[..120];
        return limpio.Length == 0 ? "documento.pdf" : limpio;
    }
}
