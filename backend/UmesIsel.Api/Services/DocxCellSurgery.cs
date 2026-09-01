using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;

namespace UmesIsel.Api.Services;

/// <summary>
/// Llena un .docx real (los FORMATO de Preinscripción y Carta de Compromiso que dio el usuario) sin
/// tocar su diseño — misma filosofía que <see cref="FichaXlsxBuilder"/> para la ficha de asignación,
/// adaptada a WordprocessingML.
///
/// Las dos plantillas (Resources/PreinscripcionTemplate.docx, Resources/CartaCompromisoTemplate.docx)
/// son el archivo original tal cual, con una única preparación de una vez: se insertó un token de
/// texto plano <c>{{NOMBRE_DEL_CAMPO}}</c> en cada espacio en blanco (celda vacía o renglón
/// subrayado) y, junto a cada opción de casilla o documento del checklist, un token de marca
/// (p. ej. <c>{{PUEBLO_LADINO}}</c>) que se resuelve a " ✓" cuando esa opción aplica o a cadena vacía
/// si no — sin tocar ni un borde, fuente, imagen o casilla del diseño original. Esa preparación vive
/// en <c>tools/docx-templates/prepare-preinscripcion.mjs</c> y <c>prepare-carta.mjs</c> (Node, se
/// corre a mano solo si el FORMATO oficial cambia); en producción, llenar la ficha es solo
/// reemplazar cada token por su valor real.
/// </summary>
public static class DocxCellSurgery
{
    public const string CheckedMark = " ✓";

    public static string ReadEntry(ZipArchive archive, string entryName)
    {
        var entry = archive.GetEntry(entryName) ?? throw new InvalidOperationException(
            $"La plantilla no tiene la parte esperada '{entryName}' — ¿se reemplazó el archivo?");
        using var stream = entry.Open();
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    public static void WriteEntry(ZipArchive archive, string entryName, string content)
    {
        archive.GetEntry(entryName)?.Delete();
        var entry = archive.CreateEntry(entryName, CompressionLevel.Optimal);
        using var stream = entry.Open();
        using var writer = new StreamWriter(stream, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
        writer.Write(content);
    }

    /// <summary>Reemplaza <c>{{token}}</c> por el valor (vacío si es null) — todo token vive siempre en la plantilla, así que esto nunca falla por no encontrarlo.</summary>
    public static string ReplaceToken(string xml, string token, string? value) =>
        xml.Replace("{{" + token + "}}", XmlEscapeText(value ?? string.Empty));

    /// <summary>Azúcar para casillas: pone el "✓" si <paramref name="isChecked"/>, o nada si no.</summary>
    public static string ReplaceCheckToken(string xml, string token, bool isChecked) =>
        ReplaceToken(xml, token, isChecked ? CheckedMark : string.Empty);

    // ---- Casillas que son IMÁGENES, no texto -----------------------------------------------------
    // La Solicitud de Título no dibuja sus casillas con caracteres: cada una es un PNG
    // ("Icono de casilla sin marcar"). Escribirles un "✓" al lado dejaría la marca FUERA del
    // recuadro. En su lugar, la plantilla preparada le da a cada casilla su propia relación de
    // imagen (rIdChk...) y marcarla es apuntar esa relación al PNG marcado — que es el MISMO
    // recuadro original con una X dibujada dentro (ver tools/docx-templates/png-check.mjs). Así la
    // casilla queda marcada sin desplazar un solo píxel del diseño.
    public const string CheckedBoxMedia = "media/casillaMarcada.png";

    public static void SetCheckboxes(ZipArchive archive, IReadOnlyDictionary<string, bool> marcas)
    {
        var rels = ReadEntry(archive, "word/_rels/document.xml.rels");
        foreach (var (relId, marcada) in marcas)
        {
            if (!marcada) continue;
            rels = Regex.Replace(
                rels,
                $"(<Relationship Id=\"{Regex.Escape(relId)}\"[^>]*Target=\")[^\"]+(\")",
                $"$1{CheckedBoxMedia}$2");
        }
        WriteEntry(archive, "word/_rels/document.xml.rels", rels);
    }

    public static string XmlEscapeText(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    // ---- Firma (imagen flotante) -----------------------------------------------------------------
    // El token {{FIRMA}} vive en un <w:r><w:t>{{FIRMA}}</w:t></w:r> insertado DENTRO de un párrafo
    // que YA existe en el documento (ver los scripts de preparación) — nunca en un párrafo nuevo.
    // Estas dos plantillas quedan ajustadas a una sola hoja al límite exacto: un párrafo nuevo, por
    // corto que sea, empuja la última línea a una segunda hoja (se comprobó al imprimir). Por eso la
    // firma se inserta como una imagen FLOTANTE (ancla wp:anchor, como ya usa el propio documento
    // para sus casillas y su línea de firma) en vez de una imagen en línea: un elemento flotante no
    // ocupa espacio en el flujo de texto, así que no puede correr nada a otra página.
    // `buildPosition` recibe el tamaño ya escalado de la imagen (cx, cy en EMU) y devuelve el XML de
    // wp:positionH + wp:positionV — cada plantilla tiene su propio punto de referencia (ver los
    // builders), así que lo decide quien llama.
    public static string InsertSignatureImage(
        ZipArchive archive,
        string documentXml,
        string firmaToken,
        string firmaBase64,
        Func<long, long, string> buildPosition)
    {
        var commaIdx = firmaBase64.IndexOf(',');
        var base64 = commaIdx >= 0 ? firmaBase64[(commaIdx + 1)..] : firmaBase64;
        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(base64);
        }
        catch (FormatException)
        {
            return ReplaceToken(documentXml, firmaToken, null); // firma inválida — se imprime sin ella
        }

        const string mediaEntryName = "word/media/imageFirma.png";
        archive.GetEntry(mediaEntryName)?.Delete();
        var mediaEntry = archive.CreateEntry(mediaEntryName, CompressionLevel.Optimal);
        using (var s = mediaEntry.Open())
        {
            s.Write(bytes, 0, bytes.Length);
        }

        const string relId = "rIdFirma";
        var relsXml = ReadEntry(archive, "word/_rels/document.xml.rels");
        if (!relsXml.Contains(relId))
        {
            relsXml = relsXml.Replace(
                "</Relationships>",
                $@"<Relationship Id=""{relId}"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"" Target=""media/imageFirma.png""/></Relationships>");
        }
        WriteEntry(archive, "word/_rels/document.xml.rels", relsXml);

        EnsurePngContentType(archive);

        const long emuPerPixelAt96Dpi = 9525;
        const long boxWidthEmu = 1_900_000; // ~2.1in
        const long boxHeightEmu = 450_000; // ~0.5in — al ser flotante, no empuja nada de contenido
        var (pngWidthPx, pngHeightPx) = ReadPngDimensions(bytes);
        long extCx, extCy;
        if (pngWidthPx > 0 && pngHeightPx > 0)
        {
            var naturalWidthEmu = pngWidthPx * emuPerPixelAt96Dpi;
            var naturalHeightEmu = pngHeightPx * emuPerPixelAt96Dpi;
            var scale = Math.Min(1.0, Math.Min((double)boxWidthEmu / naturalWidthEmu, (double)boxHeightEmu / naturalHeightEmu));
            extCx = (long)(naturalWidthEmu * scale);
            extCy = (long)(naturalHeightEmu * scale);
        }
        else
        {
            extCx = boxWidthEmu / 2;
            extCy = boxHeightEmu;
        }

        var drawing = BuildAnchoredDrawing(relId, 9001, "Firma", extCx, extCy, buildPosition(extCx, extCy));
        return ReplaceTokenRun(documentXml, firmaToken, $"<w:r>{drawing}</w:r>");
    }

    /// <summary>
    /// Igual que <see cref="InsertSignatureImage"/> pero para cualquier imagen y cualquier caja: la
    /// foto del recuadro "PEGAR FOTOGRAFÍA RECIENTE" de la Solicitud de Título entra por aquí.
    /// Sigue siendo FLOTANTE por la misma razón: esa ficha cabe justo en una hoja y cualquier cosa
    /// que ocupe sitio en el flujo de texto la partiría en dos.
    ///
    /// La imagen se escala para CABER en la caja conservando su proporción; si quien llama ya la
    /// entrega con la proporción exacta de la caja (que es lo que hace el recorte del frontend), la
    /// llena entera sin deformarse.
    /// </summary>
    public static string InsertFloatingImage(
        ZipArchive archive,
        string documentXml,
        string token,
        string dataUrl,
        string mediaBaseName,
        string relId,
        int drawingId,
        string drawingName,
        long boxWidthEmu,
        long boxHeightEmu,
        Func<long, long, string> buildPosition)
    {
        if (!TryDecodeDataUrl(dataUrl, out var bytes, out var extension))
        {
            return ReplaceToken(documentXml, token, null); // imagen inválida — se imprime sin ella
        }

        var mediaEntryName = $"word/media/{mediaBaseName}{extension}";
        archive.GetEntry(mediaEntryName)?.Delete();
        var mediaEntry = archive.CreateEntry(mediaEntryName, CompressionLevel.Optimal);
        using (var s = mediaEntry.Open())
        {
            s.Write(bytes, 0, bytes.Length);
        }

        var relsXml = ReadEntry(archive, "word/_rels/document.xml.rels");
        if (!relsXml.Contains($"Id=\"{relId}\""))
        {
            relsXml = relsXml.Replace(
                "</Relationships>",
                $@"<Relationship Id=""{relId}"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"" Target=""media/{mediaBaseName}{extension}""/></Relationships>");
            WriteEntry(archive, "word/_rels/document.xml.rels", relsXml);
        }

        EnsureContentType(archive, extension.TrimStart('.'));

        var (px, py) = ReadImageDimensions(bytes);
        long cx = boxWidthEmu, cy = boxHeightEmu;
        if (px > 0 && py > 0)
        {
            var scale = Math.Min((double)boxWidthEmu / px, (double)boxHeightEmu / py);
            cx = (long)Math.Round(px * scale);
            cy = (long)Math.Round(py * scale);
        }

        var drawing = BuildAnchoredDrawing(relId, drawingId, drawingName, cx, cy, buildPosition(cx, cy));
        return ReplaceTokenRun(documentXml, token, $"<w:r>{drawing}</w:r>");
    }

    // xmlns declarados aquí mismo (no solo asumidos del <w:document> raíz): CartaCompromisoTemplate
    // no trae xmlns:a/xmlns:pic en su elemento raíz (PreinscripcionTemplate sí, por eso el primer
    // intento funcionaba en una y no en la otra) — LibreOffice rechaza el .docx entero
    // ("source file could not be loaded") si algún prefijo queda sin declarar en su alcance.
    private static string BuildAnchoredDrawing(string relId, int id, string name, long cx, long cy, string position) =>
        "<w:drawing>" +
        $@"<wp:anchor xmlns:wp=""http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"" xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" xmlns:pic=""http://schemas.openxmlformats.org/drawingml/2006/picture"" xmlns:r=""http://schemas.openxmlformats.org/officeDocument/2006/relationships"" distT=""0"" distB=""0"" distL=""0"" distR=""0"" allowOverlap=""1"" layoutInCell=""1"" locked=""0"" behindDoc=""0"" simplePos=""0"" relativeHeight=""487700000"">" +
        @"<wp:simplePos x=""0"" y=""0""/>" +
        position +
        $@"<wp:extent cx=""{cx}"" cy=""{cy}""/>" +
        @"<wp:effectExtent l=""0"" t=""0"" r=""0"" b=""0""/>" +
        @"<wp:wrapNone/>" +
        $@"<wp:docPr id=""{id}"" name=""{name}""/>" +
        "<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect=\"1\"/></wp:cNvGraphicFramePr>" +
        "<a:graphic><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">" +
        "<pic:pic>" +
        $@"<pic:nvPicPr><pic:cNvPr id=""{id}"" name=""{name}""/><pic:cNvPicPr/></pic:nvPicPr>" +
        $@"<pic:blipFill><a:blip r:embed=""{relId}""/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>" +
        $@"<pic:spPr><a:xfrm><a:off x=""0"" y=""0""/><a:ext cx=""{cx}"" cy=""{cy}""/></a:xfrm><a:prstGeom prst=""rect""><a:avLst/></a:prstGeom></pic:spPr>" +
        "</pic:pic>" +
        "</a:graphicData></a:graphic>" +
        "</wp:anchor>" +
        "</w:drawing>";

    /// <summary>Sustituye el run que contiene el token por <paramref name="newRun"/>; si el token ya no está, deja el XML igual.</summary>
    private static string ReplaceTokenRun(string documentXml, string token, string newRun)
    {
        var runPattern = new Regex($@"<w:r>(?:(?!</w:r>).)*?\{{\{{{Regex.Escape(token)}\}}\}}(?:(?!</w:r>).)*?</w:r>", RegexOptions.Singleline);
        var match = runPattern.Match(documentXml);
        if (!match.Success) return documentXml;
        return string.Concat(documentXml.AsSpan(0, match.Index), newRun, documentXml.AsSpan(match.Index + match.Length));
    }

    /// <summary>data URL ("data:image/jpeg;base64,…") o base64 pelado -> bytes + extensión de archivo.</summary>
    private static bool TryDecodeDataUrl(string dataUrl, out byte[] bytes, out string extension)
    {
        bytes = Array.Empty<byte>();
        extension = ".png";
        if (string.IsNullOrWhiteSpace(dataUrl)) return false;

        var commaIdx = dataUrl.IndexOf(',');
        var header = commaIdx >= 0 ? dataUrl[..commaIdx] : string.Empty;
        var base64 = commaIdx >= 0 ? dataUrl[(commaIdx + 1)..] : dataUrl;
        if (header.Contains("jpeg", StringComparison.OrdinalIgnoreCase) || header.Contains("jpg", StringComparison.OrdinalIgnoreCase))
        {
            extension = ".jpeg";
        }

        try
        {
            bytes = Convert.FromBase64String(base64);
        }
        catch (FormatException)
        {
            return false;
        }
        return bytes.Length > 0;
    }

    private static void EnsureContentType(ZipArchive archive, string extension)
    {
        var contentType = extension is "jpeg" or "jpg" ? "image/jpeg" : "image/png";
        var xml = ReadEntry(archive, "[Content_Types].xml");
        if (xml.Contains($@"Extension=""{extension}"""))
        {
            return;
        }
        xml = xml.Replace("</Types>", $@"<Default Extension=""{extension}"" ContentType=""{contentType}""/></Types>");
        WriteEntry(archive, "[Content_Types].xml", xml);
    }

    /// <summary>Ancho/alto en píxeles de un PNG o un JPEG; (0,0) si no se reconoce el formato.</summary>
    private static (int Width, int Height) ReadImageDimensions(byte[] bytes)
    {
        var png = ReadPngDimensions(bytes);
        return png.Width > 0 ? png : ReadJpegDimensions(bytes);
    }

    /// <summary>Recorre los segmentos del JPEG hasta el SOF, que es donde viven alto y ancho.</summary>
    private static (int Width, int Height) ReadJpegDimensions(byte[] b)
    {
        if (b.Length < 4 || b[0] != 0xFF || b[1] != 0xD8) return (0, 0);
        var i = 2;
        while (i + 9 < b.Length)
        {
            if (b[i] != 0xFF)
            {
                i++;
                continue;
            }
            var marker = b[i + 1];
            // SOF0..SOF15, salvo DHT (C4), JPG (C8) y DAC (CC), que no son marcos de imagen.
            if (marker >= 0xC0 && marker <= 0xCF && marker != 0xC4 && marker != 0xC8 && marker != 0xCC)
            {
                return (Width: (b[i + 7] << 8) | b[i + 8], Height: (b[i + 5] << 8) | b[i + 6]);
            }
            if (marker == 0xD8 || marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7))
            {
                i += 2;
                continue;
            }
            var length = (b[i + 2] << 8) | b[i + 3];
            if (length <= 0) return (0, 0);
            i += 2 + length;
        }
        return (0, 0);
    }

    private static void EnsurePngContentType(ZipArchive archive)
    {
        var xml = ReadEntry(archive, "[Content_Types].xml");
        if (xml.Contains(@"Extension=""png"""))
        {
            return;
        }
        xml = xml.Replace("</Types>", @"<Default Extension=""png"" ContentType=""image/png""/></Types>");
        WriteEntry(archive, "[Content_Types].xml", xml);
    }

    private static (int Width, int Height) ReadPngDimensions(byte[] png)
    {
        if (png.Length < 24 || png[0] != 0x89 || png[1] != 0x50 || png[2] != 0x4E || png[3] != 0x47)
        {
            return (0, 0);
        }
        int width = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19];
        int height = (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23];
        return (width, height);
    }
}
