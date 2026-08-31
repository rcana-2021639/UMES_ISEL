using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;

namespace UmesIsel.Api.Services;

/// <summary>
/// La misma técnica de "cirugía de celdas" que <see cref="FichaXlsxBuilder"/> usa para la ficha de
/// asignación (rellenar un .xlsx real editando directamente su XML, sin rehacer el diseño en
/// HTML/CSS), extraída aquí para que <see cref="PreinscripcionXlsxBuilder"/> y
/// <see cref="CartaCompromisoXlsxBuilder"/> —plantillas nuevas, generadas desde cero con
/// <c>tools/xlsx-templates/build.mjs</c>— la reutilicen sin copiar y pegar. <see cref="FichaXlsxBuilder"/>
/// se deja intacto: ya funciona con la plantilla oficial de la universidad y no hace falta arriesgarlo.
///
/// Diferencia con la plantilla de asignación: esas dos plantillas nuevas no traen controles de
/// formulario de Excel para las casillas — son texto plano horneado como "[ ] Opción" en la celda, y
/// "marcar" una opción es sobrescribir esa única celda con "[X] Opción" (ver <see cref="SetChecked"/>);
/// las demás casillas se quedan "desmarcadas" tal como vienen en la plantilla, sin tocarlas.
/// </summary>
public static class XlsxCellSurgery
{
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

    /// <summary>Reemplaza el contenido de una celda por un texto (inline string), conservando su estilo (s="…").</summary>
    public static string SetCell(string xml, string cellRef, string? value)
    {
        if (string.IsNullOrEmpty(value)) return xml;

        var pattern = $@"<c r=""{Regex.Escape(cellRef)}""([^>]*?)(/>|>.*?</c>)";
        var match = Regex.Match(xml, pattern, RegexOptions.Singleline);
        if (!match.Success) return xml; // el layout de la plantilla cambió — se omite en vez de corromper el archivo

        var attrs = Regex.Replace(match.Groups[1].Value, @"\s+t=""[^""]*""", "");
        var escaped = XmlEscapeText(value);
        var replacement = $@"<c r=""{cellRef}""{attrs} t=""inlineStr""><is><t xml:space=""preserve"">{escaped}</t></is></c>";
        return string.Concat(xml.AsSpan(0, match.Index), replacement, xml.AsSpan(match.Index + match.Length));
    }

    /// <summary>Marca una casilla "[ ] label" → "[X] label" cuando <paramref name="isChecked"/> es true; si no, no toca la celda (queda desmarcada tal como viene en la plantilla).</summary>
    public static string SetChecked(string xml, string cellRef, string label, bool isChecked) =>
        isChecked ? SetCell(xml, cellRef, $"[X] {label}") : xml;

    public static string XmlEscapeText(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    /// <summary>Fuerza "ajustar a una página" en la impresión, igual que hace FichaXlsxBuilder.</summary>
    public static string ForceFitToOnePage(string xml)
    {
        if (!xml.Contains("<sheetPr>") && !xml.Contains("<sheetPr/>"))
        {
            xml = Regex.Replace(xml, @"(<worksheet[^>]*>)", "$1<sheetPr><pageSetUpPr fitToPage=\"1\"/></sheetPr>");
        }
        xml = Regex.Replace(xml, @"<pageSetup ", "<pageSetup fitToWidth=\"1\" fitToHeight=\"1\" ");
        return xml;
    }

    /// <summary>
    /// Inserta la firma (PNG en base64) sobre una celda ancla, escalada (nunca agrandada) para caber
    /// dentro de la caja indicada sin distorsionar su proporción, alineada abajo-centro — misma lógica
    /// que <c>FichaXlsxBuilder.InsertSignatureImage</c>, parametrizada para plantillas distintas.
    /// </summary>
    public static void InsertSignatureImage(
        ZipArchive archive,
        string firmaBase64,
        int anchorColZeroBased,
        int anchorRowZeroBased,
        long boxWidthEmu,
        long boxHeightEmu,
        string mediaEntryName,
        string relId)
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
            return; // firma inválida — se imprime la ficha sin ella en vez de fallar la solicitud entera
        }

        archive.GetEntry(mediaEntryName)?.Delete();
        var mediaEntry = archive.CreateEntry(mediaEntryName, CompressionLevel.Optimal);
        using (var s = mediaEntry.Open())
        {
            s.Write(bytes, 0, bytes.Length);
        }

        var relsXml = ReadEntry(archive, "xl/drawings/_rels/drawing1.xml.rels");
        if (!relsXml.Contains(relId))
        {
            relsXml = relsXml.Replace(
                "</Relationships>",
                $@"<Relationship Id=""{relId}"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"" Target=""../media/{Path.GetFileName(mediaEntryName)}""/></Relationships>");
        }
        WriteEntry(archive, "xl/drawings/_rels/drawing1.xml.rels", relsXml);

        const long emuPerPixelAt96Dpi = 9525;
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

        var rowOff = Math.Max(0, boxHeightEmu - extCy);
        var colOff = Math.Max(0, (boxWidthEmu - extCx) / 2);
        var picId = new Random(mediaEntryName.GetHashCode()).Next(9100, 9999);

        var anchor =
            "<xdr:oneCellAnchor>" +
            $"<xdr:from><xdr:col>{anchorColZeroBased}</xdr:col><xdr:colOff>{colOff}</xdr:colOff><xdr:row>{anchorRowZeroBased}</xdr:row><xdr:rowOff>{rowOff}</xdr:rowOff></xdr:from>" +
            $@"<xdr:ext cx=""{extCx}"" cy=""{extCy}""/>" +
            "<xdr:pic>" +
            $@"<xdr:nvPicPr><xdr:cNvPr id=""{picId}"" name=""Firma""/><xdr:cNvPicPr><a:picLocks xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" noChangeAspect=""1""/></xdr:cNvPicPr></xdr:nvPicPr>" +
            $@"<xdr:blipFill><a:blip xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" xmlns:r=""http://schemas.openxmlformats.org/officeDocument/2006/relationships"" r:embed=""{relId}""/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>" +
            $@"<xdr:spPr><a:xfrm xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main""><a:off x=""0"" y=""0""/><a:ext cx=""{extCx}"" cy=""{extCy}""/></a:xfrm><a:prstGeom xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" prst=""rect""><a:avLst/></a:prstGeom></xdr:spPr>" +
            "</xdr:pic>" +
            "<xdr:clientData/>" +
            "</xdr:oneCellAnchor>";

        var drawingXml = ReadEntry(archive, "xl/drawings/drawing1.xml");
        drawingXml = drawingXml.Replace("</xdr:wsDr>", anchor + "</xdr:wsDr>");
        WriteEntry(archive, "xl/drawings/drawing1.xml", drawingXml);
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
