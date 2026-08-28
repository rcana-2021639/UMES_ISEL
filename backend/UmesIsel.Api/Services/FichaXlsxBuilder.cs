using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using UmesIsel.Api.Models.Dtos;

namespace UmesIsel.Api.Services;

/// <summary>
/// Fills the user's official "Ficha de Asignación de Cursos 2026.xlsx" workbook (kept verbatim at
/// <c>Resources/FichaTemplate.xlsx</c>) with one student's data and returns a ready-to-print copy.
///
/// This deliberately does NOT rebuild the ficha's layout in HTML/CSS — the user was explicit that the
/// printed output has to be their exact spreadsheet, not an approximation of it. Instead this opens the
/// template's .xlsx (which is just a zip of OOXML/SpreadsheetML parts) and performs targeted surgery on
/// three parts, leaving every byte of everything else (borders, merges, column widths, fonts, the
/// vector UMES/ISEL letterhead, the two "No/Sí" Excel Form checkboxes) completely untouched:
///
///  - xl/worksheets/sheet1.xml — each data cell (student name, carrera, courses, etc.) is a known,
///    fixed cell reference in this template (see the map below); we replace only those cells' content.
///  - xl/drawings/vmlDrawing1.vml — the two Sí/No pairs are real unlinked Excel Form-control checkboxes,
///    not text; a checkbox reads as "checked" when its shape carries an <x:Checked>1</x:Checked> tag.
///  - xl/drawings/drawing1.xml (+ a new xl/media/*.png + a new relationship) — the student's digital
///    signature, when present, is inserted as a picture anchored over the blank signature line.
///
/// If the template file is ever replaced (e.g. the official design changes), re-map the cell references
/// below to match — see the README note next to this class for how to inspect a new template's layout.
/// </summary>
public class FichaXlsxBuilder
{
    private readonly string _templatePath;

    public FichaXlsxBuilder(IWebHostEnvironment env)
    {
        _templatePath = Path.Combine(env.ContentRootPath, "Resources", "FichaTemplate.xlsx");
    }

    public byte[] Build(CourseAssignmentDto ca)
    {
        var templateBytes = File.ReadAllBytes(_templatePath);
        using var output = new MemoryStream();
        output.Write(templateBytes, 0, templateBytes.Length);
        output.Position = 0;

        using (var archive = new ZipArchive(output, ZipArchiveMode.Update, leaveOpen: true))
        {
            var sheetXml = ApplyCellValues(ReadEntry(archive, "xl/worksheets/sheet1.xml"), ca);
            WriteEntry(archive, "xl/worksheets/sheet1.xml", sheetXml);

            var vmlXml = ApplyCheckboxes(
                ReadEntry(archive, "xl/drawings/vmlDrawing1.vml"),
                ca.TienePendientesTrimestres,
                ca.TienePendientesMaterias);
            WriteEntry(archive, "xl/drawings/vmlDrawing1.vml", vmlXml);

            if (!string.IsNullOrWhiteSpace(ca.FirmaBase64))
            {
                InsertSignatureImage(archive, ca.FirmaBase64);
            }
        }

        return output.ToArray();
    }

    // ---- Cell map -----------------------------------------------------------------------------
    // Row/column references straight from Resources/FichaTemplate.xlsx (A1:L39 sheet). See the
    // XML dump this was built from for the full picture; the short version:
    //   Row 5/6: name headers (row5) + NOMBRE COMPLETO/CARNÉ/FECHA data row (row6)
    //   Row 7:   CARRERA: (B7:I7) ............ SEM/TRIM (K7:L7)
    //   Rows 13-17: "cursos asignados" — 2 columns of 5 (slots 1-5 left, 6-10 right)
    //   Rows 21-25: "cursos adicionales" — 5 rows
    //   Rows 27/28: the two Sí/No observaciones (real Excel checkboxes, handled separately)
    //   Row 30: blank signature line (A:E) / "autorizado por" line (I:L)
    //   Row 33: Correo electrónico (B33:D33) / Teléfono (G33:H33) / Comprobante de pago (K33 — left
    //           blank on purpose; that field was removed from the app, nothing to put there)
    private static string ApplyCellValues(string xml, CourseAssignmentDto ca)
    {
        xml = SetCell(xml, "D6", ca.PrimerApellido);
        xml = SetCell(xml, "E6", ca.SegundoApellido);
        xml = SetCell(xml, "G6", ca.PrimerNombre);
        xml = SetCell(xml, "I6", ca.SegundoNombre);
        xml = SetCell(xml, "K5", ca.Fecha.ToString("dd/MM/yyyy"));
        xml = SetCell(xml, "K6", ca.Carnet);
        xml = SetCell(xml, "B7", ca.Carrera);
        xml = SetCell(xml, "K7", ca.Trimestre.ToString());

        var asignados = ca.CursosAsignados.OrderBy(r => r.Numero).ToList();
        string[] leftCurso = { "B13", "B14", "B15", "B16", "B17" };
        string[] leftSemTri = { "E13", "E14", "E15", "E16", "E17" };
        string[] leftSeccion = { "F13", "F14", "F15", "F16", "F17" };
        string[] rightCurso = { "H13", "H14", "H15", "H16", "H17" };
        string[] rightSemTri = { "K13", "K14", "K15", "K16", "K17" };
        string[] rightSeccion = { "L13", "L14", "L15", "L16", "L17" };
        for (var i = 0; i < 5 && i < asignados.Count; i++)
        {
            xml = SetCell(xml, leftCurso[i], asignados[i].Curso);
            xml = SetCell(xml, leftSemTri[i], asignados[i].SemTri);
            xml = SetCell(xml, leftSeccion[i], asignados[i].Seccion);
        }
        for (var i = 5; i < 10 && i < asignados.Count; i++)
        {
            var idx = i - 5;
            xml = SetCell(xml, rightCurso[idx], asignados[i].Curso);
            xml = SetCell(xml, rightSemTri[idx], asignados[i].SemTri);
            xml = SetCell(xml, rightSeccion[idx], asignados[i].Seccion);
        }
        // The template's grid is a fixed 10 slots (matching the physical paper form) — extremely
        // unlikely to be exceeded by a real trimestre's course count, so anything past slot 10
        // simply doesn't fit, same limit the original paper form has.

        var adicionales = ca.CursosAdicionales.OrderBy(r => r.Numero).ToList();
        string[] adiCurso = { "B21", "B22", "B23", "B24", "B25" };
        string[] adiCarrera = { "E21", "E22", "E23", "E24", "E25" };
        string[] adiSemTri = { "I21", "I22", "I23", "I24", "I25" };
        string[] adiSeccion = { "J21", "J22", "J23", "J24", "J25" };
        string[] adiJornada = { "K21", "K22", "K23", "K24", "K25" };
        for (var i = 0; i < 5 && i < adicionales.Count; i++)
        {
            xml = SetCell(xml, adiCurso[i], adicionales[i].CursoAdicional);
            xml = SetCell(xml, adiCarrera[i], adicionales[i].Carrera);
            xml = SetCell(xml, adiSemTri[i], adicionales[i].SemTri);
            xml = SetCell(xml, adiSeccion[i], adicionales[i].Seccion);
            xml = SetCell(xml, adiJornada[i], adicionales[i].Jornada);
        }

        xml = SetCell(xml, "I30", ca.AutorizadoPorCodigo);
        xml = SetCell(xml, "B33", ca.CorreoContacto);
        xml = SetCell(xml, "G33", ca.TelefonoContacto);

        return xml;
    }

    /// <summary>Replaces one cell's content with an inline string, preserving its existing style (s="…").</summary>
    private static string SetCell(string xml, string cellRef, string? value)
    {
        if (string.IsNullOrEmpty(value)) return xml;

        var pattern = $@"<c r=""{Regex.Escape(cellRef)}""([^>]*?)(/>|>.*?</c>)";
        var match = Regex.Match(xml, pattern, RegexOptions.Singleline);
        if (!match.Success) return xml; // template layout changed unexpectedly — skip rather than corrupt the file

        var attrs = Regex.Replace(match.Groups[1].Value, @"\s+t=""[^""]*""", ""); // drop any old value-type attr
        var escaped = XmlEscapeText(value);
        var replacement = $@"<c r=""{cellRef}""{attrs} t=""inlineStr""><is><t xml:space=""preserve"">{escaped}</t></is></c>";
        return string.Concat(xml.AsSpan(0, match.Index), replacement, xml.AsSpan(match.Index + match.Length));
    }

    private static string XmlEscapeText(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    // ---- Checkboxes -----------------------------------------------------------------------------
    // Shapes appear in vmlDrawing1.vml in this fixed order: s1199="No"(fila27) s1201="Sí"(fila27)
    // s1203="No"(fila28) s1204="Sí"(fila28). They're unlinked Form controls (no cell drives them),
    // so "checking" one means writing <x:Checked>1</x:Checked> into that shape's <x:ClientData>.
    private static string ApplyCheckboxes(string vml, bool pendientesTrimestres, bool pendientesMaterias)
    {
        vml = SetChecked(vml, "_x0000_s1199", !pendientesTrimestres);
        vml = SetChecked(vml, "_x0000_s1201", pendientesTrimestres);
        vml = SetChecked(vml, "_x0000_s1203", !pendientesMaterias);
        vml = SetChecked(vml, "_x0000_s1204", pendientesMaterias);
        return vml;
    }

    private static string SetChecked(string vml, string shapeId, bool @checked)
    {
        var pattern = $@"<v:shape id=""{Regex.Escape(shapeId)}"".*?</v:shape>";
        var match = Regex.Match(vml, pattern, RegexOptions.Singleline);
        if (!match.Success) return vml;

        var block = Regex.Replace(match.Value, @"<x:Checked>\d+</x:Checked>", "");
        if (@checked)
        {
            block = block.Replace("</x:ClientData>", "<x:Checked>1</x:Checked></x:ClientData>");
        }
        return string.Concat(vml.AsSpan(0, match.Index), block, vml.AsSpan(match.Index + match.Length));
    }

    // ---- Signature image -----------------------------------------------------------------------
    private static void InsertSignatureImage(ZipArchive archive, string firmaBase64)
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
            return; // malformed signature data — print the ficha without it rather than fail the whole request
        }

        const string mediaEntryName = "xl/media/imageFirma.png";
        archive.GetEntry(mediaEntryName)?.Delete();
        var mediaEntry = archive.CreateEntry(mediaEntryName, CompressionLevel.Optimal);
        using (var s = mediaEntry.Open())
        {
            s.Write(bytes, 0, bytes.Length);
        }

        const string relId = "rIdFirma";
        var relsXml = ReadEntry(archive, "xl/drawings/_rels/drawing1.xml.rels");
        if (!relsXml.Contains(relId))
        {
            relsXml = relsXml.Replace(
                "</Relationships>",
                $@"<Relationship Id=""{relId}"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"" Target=""../media/imageFirma.png""/></Relationships>");
        }
        WriteEntry(archive, "xl/drawings/_rels/drawing1.xml.rels", relsXml);

        // Anchored just above the blank signature line (row 30, 1-indexed) across columns A:E —
        // the same span as the "FIRMA DEL ALUMNO(A)" caption merge (A31:E31) below it.
        var anchor =
            "<xdr:twoCellAnchor>" +
            "<xdr:from><xdr:col>0</xdr:col><xdr:colOff>60000</xdr:colOff><xdr:row>27</xdr:row><xdr:rowOff>10000</xdr:rowOff></xdr:from>" +
            "<xdr:to><xdr:col>4</xdr:col><xdr:colOff>500000</xdr:colOff><xdr:row>29</xdr:row><xdr:rowOff>60000</xdr:rowOff></xdr:to>" +
            "<xdr:pic>" +
            @"<xdr:nvPicPr><xdr:cNvPr id=""9001"" name=""Firma""/><xdr:cNvPicPr><a:picLocks xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" noChangeAspect=""1""/></xdr:cNvPicPr></xdr:nvPicPr>" +
            $@"<xdr:blipFill><a:blip xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" xmlns:r=""http://schemas.openxmlformats.org/officeDocument/2006/relationships"" r:embed=""{relId}""/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>" +
            @"<xdr:spPr><a:xfrm xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main""><a:off x=""0"" y=""0""/><a:ext cx=""0"" cy=""0""/></a:xfrm><a:prstGeom xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" prst=""rect""><a:avLst/></a:prstGeom></xdr:spPr>" +
            "</xdr:pic>" +
            "<xdr:clientData/>" +
            "</xdr:twoCellAnchor>";

        var drawingXml = ReadEntry(archive, "xl/drawings/drawing1.xml");
        drawingXml = drawingXml.Replace("</xdr:wsDr>", anchor + "</xdr:wsDr>");
        WriteEntry(archive, "xl/drawings/drawing1.xml", drawingXml);
    }

    // ---- Zip entry helpers ----------------------------------------------------------------------
    private static string ReadEntry(ZipArchive archive, string entryName)
    {
        var entry = archive.GetEntry(entryName) ?? throw new InvalidOperationException(
            $"La plantilla de la ficha no tiene la parte esperada '{entryName}' — ¿se reemplazó el archivo?");
        using var stream = entry.Open();
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    private static void WriteEntry(ZipArchive archive, string entryName, string content)
    {
        archive.GetEntry(entryName)?.Delete();
        var entry = archive.CreateEntry(entryName, CompressionLevel.Optimal);
        using var stream = entry.Open();
        using var writer = new StreamWriter(stream, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
        writer.Write(content);
    }
}
