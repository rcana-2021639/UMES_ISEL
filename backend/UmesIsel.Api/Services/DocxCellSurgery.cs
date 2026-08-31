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

        // xmlns declarados aquí mismo (no solo asumidos del <w:document> raíz): CartaCompromisoTemplate
        // no trae xmlns:a/xmlns:pic en su elemento raíz (PreinscripcionTemplate sí, por eso el primer
        // intento funcionaba en una y no en la otra) — LibreOffice rechaza el .docx entero
        // ("source file could not be loaded") si algún prefijo queda sin declarar en su alcance.
        var drawing =
            "<w:drawing>" +
            $@"<wp:anchor xmlns:wp=""http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"" xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" xmlns:pic=""http://schemas.openxmlformats.org/drawingml/2006/picture"" xmlns:r=""http://schemas.openxmlformats.org/officeDocument/2006/relationships"" distT=""0"" distB=""0"" distL=""0"" distR=""0"" allowOverlap=""1"" layoutInCell=""1"" locked=""0"" behindDoc=""0"" simplePos=""0"" relativeHeight=""487700000"">" +
            @"<wp:simplePos x=""0"" y=""0""/>" +
            buildPosition(extCx, extCy) +
            $@"<wp:extent cx=""{extCx}"" cy=""{extCy}""/>" +
            @"<wp:effectExtent l=""0"" t=""0"" r=""0"" b=""0""/>" +
            @"<wp:wrapNone/>" +
            @"<wp:docPr id=""9001"" name=""Firma""/>" +
            "<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect=\"1\"/></wp:cNvGraphicFramePr>" +
            "<a:graphic><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">" +
            "<pic:pic>" +
            "<pic:nvPicPr><pic:cNvPr id=\"9001\" name=\"Firma\"/><pic:cNvPicPr/></pic:nvPicPr>" +
            $@"<pic:blipFill><a:blip r:embed=""{relId}""/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>" +
            $@"<pic:spPr><a:xfrm><a:off x=""0"" y=""0""/><a:ext cx=""{extCx}"" cy=""{extCy}""/></a:xfrm><a:prstGeom prst=""rect""><a:avLst/></a:prstGeom></pic:spPr>" +
            "</pic:pic>" +
            "</a:graphicData></a:graphic>" +
            "</wp:anchor>" +
            "</w:drawing>";

        var runPattern = new Regex($@"<w:r>(?:(?!</w:r>).)*?\{{\{{{Regex.Escape(firmaToken)}\}}\}}(?:(?!</w:r>).)*?</w:r>", RegexOptions.Singleline);
        var match = runPattern.Match(documentXml);
        if (!match.Success) return documentXml; // el token ya no está — no hay dónde poner la firma

        var newRun = $"<w:r>{drawing}</w:r>";
        return string.Concat(documentXml.AsSpan(0, match.Index), newRun, documentXml.AsSpan(match.Index + match.Length));
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
