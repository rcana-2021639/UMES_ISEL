using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
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
    private readonly FirmaAdminRenderer _firmaAdmin;

    public FichaXlsxBuilder(IWebHostEnvironment env, FirmaAdminRenderer firmaAdmin)
    {
        _templatePath = Path.Combine(env.ContentRootPath, "Resources", "FichaTemplate.xlsx");
        _firmaAdmin = firmaAdmin;
    }

    public byte[] Build(CourseAssignmentDto ca) => Build(ca, firmaAdmin: false);

    /// <param name="firmaAdmin">
    /// Pega al pie la firma del administrador con la fecha del día. Solo cuando imprime el panel:
    /// el alumno que abre su propia ficha no debe verla firmada por nadie, porque la revisión es
    /// justamente lo que ocurre al imprimirla en Secretaría. Ver FirmaAdminRenderer.
    /// </param>
    /// <param name="fechaFirma">
    /// La fecha junto a esa firma. Por defecto la de hoy (se está imprimiendo ahora); el archivo de
    /// fichas del reinicio pasa el día en que de verdad se imprimió cada una.
    /// </param>
    public byte[] Build(CourseAssignmentDto ca, bool firmaAdmin, DateOnly? fechaFirma = null)
    {
        var templateBytes = File.ReadAllBytes(_templatePath);
        using var output = new MemoryStream();
        output.Write(templateBytes, 0, templateBytes.Length);
        output.Position = 0;

        using (var archive = new ZipArchive(output, ZipArchiveMode.Update, leaveOpen: true))
        {
            var sheetXml = ReadEntry(archive, "xl/worksheets/sheet1.xml");
            sheetXml = ApplyCellValues(sheetXml, ca);
            sheetXml = ForceFitToOnePage(sheetXml);
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

            if (firmaAdmin && _firmaAdmin.Disponible)
            {
                InsertAdminSignature(archive, _firmaAdmin.Render(fechaFirma ?? FechaDeHoyEnGuatemala()));
            }
        }

        return output.ToArray();
    }

    // La fecha junto a la firma es la del día en que se imprime, en hora de Guatemala: el servidor
    // corre en UTC y por la tarde-noche ya va en el día siguiente.
    private static DateOnly FechaDeHoyEnGuatemala()
    {
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Guatemala");
            return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz));
        }
        catch (TimeZoneNotFoundException)
        {
            return DateOnly.FromDateTime(DateTime.Now);
        }
    }

    // ---- Firma del administrador ----------------------------------------------------------------
    /// <summary>
    /// Pega la firma+fecha al pie de la hoja, a la derecha, en el blanco que queda debajo de la NOTA.
    /// Misma mecánica que la firma del alumno (imagen en xl/media + relación + ancla en el drawing),
    /// con su propio id y nombre de archivo para no pisarla.
    /// </summary>
    private static void InsertAdminSignature(ZipArchive archive, byte[] png)
    {
        const string mediaEntryName = "xl/media/imageFirmaAdmin.png";
        archive.GetEntry(mediaEntryName)?.Delete();
        var mediaEntry = archive.CreateEntry(mediaEntryName, CompressionLevel.Optimal);
        using (var s = mediaEntry.Open())
        {
            s.Write(png, 0, png.Length);
        }

        const string relId = "rIdFirmaAdmin";
        var relsXml = ReadEntry(archive, "xl/drawings/_rels/drawing1.xml.rels");
        if (!relsXml.Contains(relId))
        {
            relsXml = relsXml.Replace(
                "</Relationships>",
                $@"<Relationship Id=""{relId}"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"" Target=""../media/imageFirmaAdmin.png""/></Relationships>");
        }
        WriteEntry(archive, "xl/drawings/_rels/drawing1.xml.rels", relsXml);

        // Altura fija de ~0.5in; el ancho sale de la proporción del PNG. Se ancla a la fila 38
        // (índice 37), la primera vacía bajo la NOTA, y sobresale hacia el margen inferior de la
        // hoja, que en esta plantilla queda libre. Se empuja hacia la derecha arrancando en la
        // columna I (índice 8) con un desplazamiento, para que quede en el tercio derecho sin
        // pegarse al borde.
        const long altoEmu = 640_000; // ~0.7in
        var (w, h) = ReadPngDimensions(png);
        long extCy = altoEmu;
        long extCx = w > 0 && h > 0 ? (long)(altoEmu * ((double)w / h)) : altoEmu * 3;

        var anchor =
            "<xdr:oneCellAnchor>" +
            "<xdr:from><xdr:col>7</xdr:col><xdr:colOff>150000</xdr:colOff><xdr:row>37</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>" +
            $@"<xdr:ext cx=""{extCx}"" cy=""{extCy}""/>" +
            "<xdr:pic>" +
            @"<xdr:nvPicPr><xdr:cNvPr id=""9002"" name=""FirmaAdmin""/><xdr:cNvPicPr><a:picLocks xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" noChangeAspect=""1""/></xdr:cNvPicPr></xdr:nvPicPr>" +
            $@"<xdr:blipFill><a:blip xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" xmlns:r=""http://schemas.openxmlformats.org/officeDocument/2006/relationships"" r:embed=""{relId}""/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>" +
            $@"<xdr:spPr><a:xfrm xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main""><a:off x=""0"" y=""0""/><a:ext cx=""{extCx}"" cy=""{extCy}""/></a:xfrm><a:prstGeom xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" prst=""rect""><a:avLst/></a:prstGeom></xdr:spPr>" +
            "</xdr:pic>" +
            "<xdr:clientData/>" +
            "</xdr:oneCellAnchor>";

        var drawingXml = ReadEntry(archive, "xl/drawings/drawing1.xml");
        drawingXml = drawingXml.Replace("</xdr:wsDr>", anchor + "</xdr:wsDr>");
        WriteEntry(archive, "xl/drawings/drawing1.xml", drawingXml);
    }

    /// <summary>The raw template, completely unfilled — only used by FichaPdfBuilder.WarmUp() to
    /// exercise the LibreOffice conversion pipeline once at startup; nothing needs to be readable.</summary>
    public byte[] BuildBlankForWarmUp() => File.ReadAllBytes(_templatePath);

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

    /// <summary>
    /// The template's own print setup has no "fit to page" scaling — printed at 100%, the last row
    /// (the footer) spills onto an almost-blank second page in both Excel and LibreOffice. The actual
    /// paper form is one page, so we force that here: fitToWidth/fitToHeight=1 on &lt;pageSetup&gt;,
    /// plus the &lt;sheetPr&gt; flag Excel/LibreOffice both require to honor it. This only changes print
    /// scaling, never the cell design itself.
    /// </summary>
    private static string ForceFitToOnePage(string xml)
    {
        if (!xml.Contains("<sheetPr>") && !xml.Contains("<sheetPr/>"))
        {
            xml = Regex.Replace(xml, @"(<worksheet[^>]*>)", "$1<sheetPr><pageSetUpPr fitToPage=\"1\"/></sheetPr>");
        }
        xml = Regex.Replace(xml, @"<pageSetup ", "<pageSetup fitToWidth=\"1\" fitToHeight=\"1\" ");
        return xml;
    }

    // ---- Checkboxes -----------------------------------------------------------------------------
    // Shapes appear in vmlDrawing1.vml in this fixed order: s1199="No"(fila27) s1201="Sí"(fila27)
    // s1203="No"(fila28) s1204="Sí"(fila28). They're unlinked Form controls (no cell drives them),
    // so "checking" one means writing <x:Checked>1</x:Checked> into that shape's <x:ClientData>.
    private static string ApplyCheckboxes(string vml, bool pendientesTrimestres, bool pendientesMaterias)
    {
        vml = WidenSiCaption(vml, "_x0000_s1201", 39);
        vml = WidenSiCaption(vml, "_x0000_s1204", 37);
        vml = SetChecked(vml, "_x0000_s1199", !pendientesTrimestres);
        vml = SetChecked(vml, "_x0000_s1201", pendientesTrimestres);
        vml = SetChecked(vml, "_x0000_s1203", !pendientesMaterias);
        vml = SetChecked(vml, "_x0000_s1204", pendientesMaterias);
        return vml;
    }

    // Las casillas de "No" del FORMATO miden 31.5 pt de ancho — lo justo para el cuadrito y su
    // leyenda — pero las de "SI" solo ~14 pt: alcanza para el cuadrito y la palabra "SI" queda
    // recortada, así que en la ficha impresa el renglón se leía "☐ No ☐" sin el "SI" a la vista. Se
    // les da el mismo ancho que a las de "No" (y se estira igual su ancla, que es lo que manda en
    // Excel); posición, tamaño de letra y todo lo demás del diseño quedan igual.
    private const double AnchoCasillaPt = 31.5;
    private const int AnchoCasillaPx = 42; // 31.5 pt en las unidades de <x:Anchor> (0.75 pt por unidad)

    private static string WidenSiCaption(string vml, string shapeId, int anchorStart)
    {
        var pattern = $@"<v:shape id=""{Regex.Escape(shapeId)}"".*?</v:shape>";
        var match = Regex.Match(vml, pattern, RegexOptions.Singleline);
        if (!match.Success) return vml;

        var block = Regex.Replace(
            match.Value,
            @"width:[\d.]+pt",
            $"width:{AnchoCasillaPt.ToString(System.Globalization.CultureInfo.InvariantCulture)}pt");
        block = Regex.Replace(
            block,
            $@"(<x:Anchor>\s*0, {anchorStart}, \d+, \d+, 0, )\d+",
            $"${{1}}{anchorStart + AnchoCasillaPx}");
        return string.Concat(vml.AsSpan(0, match.Index), block, vml.AsSpan(match.Index + match.Length));
    }

    private static string SetChecked(string vml, string shapeId, bool @checked)
    {
        var pattern = $@"<v:shape id=""{Regex.Escape(shapeId)}"".*?</v:shape>";
        var match = Regex.Match(vml, pattern, RegexOptions.Singleline);
        if (!match.Success) return vml;

        var block = Regex.Replace(match.Value, @"<x:Checked>\d+</x:Checked>", "");
        // LibreOffice's PDF export renders a "Sí" shape (which the template gives an alt="SI"
        // attribute, presumably just for accessibility) as a large solid black box once it's checked
        // — a LibreOffice-specific rendering bug, not how it looks in real Excel. The `alt` text isn't
        // load-bearing for anything else, so dropping it sidesteps the bug entirely.
        block = Regex.Replace(block, @"\s+alt=""[^""]*""", "");
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

        // Solo el trazo, sin el blanco del lienzo alrededor. Ver RecortarFirma.
        var recorte = RecortarFirma(bytes);
        if (recorte is not null) bytes = recorte.Value.Png;

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

        // Available box: columns A:E, rows 29-30 (1-indexed) — the same span as the "FIRMA DEL
        // ALUMNO(A)" caption merge (A31:E31) below it. Roughly 4.15in × 0.42in at this template's
        // actual column widths/default row height (measured once, hardcoded). The bottom edge of
        // that box IS the ficha's signature line.
        //
        // La firma se coloca SOBRE esa línea, no flotando encima: el renglón del pad de firma
        // (SignaturePad, LineaFirmaFraccion) representa la línea de la ficha, y lo que el alumno
        // trazó por encima de su renglón queda por encima de esta línea, lo que bajó (la cola de
        // una "g", una rúbrica) cruza la línea igual que en papel. El tamaño es el mayor que cabe
        // en el hueco — antes se escalaba el lienzo entero, blanco incluido, y el trazo real salía
        // diminuto y separado de la línea.
        const long boxWidthEmu = 3_800_000; // ~4.15in — columns A:E
        const long boxHeightEmu = 380_000; // ~0.42in — rows 29-30 at the default 15pt row height
        const long maxBajoLineaEmu = 100_000; // ~0.11in: lo que puede cruzar la línea sin pisar "FIRMA DEL ALUMNO(A)"

        var (pngWidthPx, pngHeightPx) = ReadPngDimensions(bytes);
        long extCx, extCy, sobreLineaEmu;
        if (pngWidthPx > 0 && pngHeightPx > 0)
        {
            // Sin recorte (PNG ilegible para ImageSharp) se trata la imagen entera como "sobre la línea".
            var baseLineaPx = recorte?.LineaPx ?? pngHeightPx;
            var sobrePx = Math.Max(1, baseLineaPx);
            var bajoPx = Math.Max(0, pngHeightPx - baseLineaPx);

            var escala = Math.Min((double)boxWidthEmu / pngWidthPx, (double)boxHeightEmu / sobrePx);
            if (bajoPx > 0) escala = Math.Min(escala, (double)maxBajoLineaEmu / bajoPx);

            extCx = (long)(pngWidthPx * escala);
            extCy = (long)(pngHeightPx * escala);
            sobreLineaEmu = (long)(sobrePx * escala);
        }
        else
        {
            // Couldn't read the PNG header (unexpected format) — fall back to a fixed, reasonable size
            // rather than guessing an aspect ratio that might distort it.
            extCx = boxWidthEmu / 2;
            extCy = boxHeightEmu;
            sobreLineaEmu = boxHeightEmu;
        }

        var rowOff = Math.Max(0, boxHeightEmu - sobreLineaEmu); // la base del trazo cae justo en la línea
        var colOff = Math.Max(0, (boxWidthEmu - extCx) / 2); // horizontally centered within the box — a
        // small fixed left pad here left most (narrower, real) signatures hugging the left edge instead
        // of sitting over the middle of the "FIRMA DEL ALUMNO(A)" line, which the user flagged as
        // looking off.

        var anchor =
            "<xdr:oneCellAnchor>" +
            $"<xdr:from><xdr:col>0</xdr:col><xdr:colOff>{colOff}</xdr:colOff><xdr:row>28</xdr:row><xdr:rowOff>{rowOff}</xdr:rowOff></xdr:from>" +
            $@"<xdr:ext cx=""{extCx}"" cy=""{extCy}""/>" +
            "<xdr:pic>" +
            @"<xdr:nvPicPr><xdr:cNvPr id=""9001"" name=""Firma""/><xdr:cNvPicPr><a:picLocks xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" noChangeAspect=""1""/></xdr:cNvPicPr></xdr:nvPicPr>" +
            $@"<xdr:blipFill><a:blip xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" xmlns:r=""http://schemas.openxmlformats.org/officeDocument/2006/relationships"" r:embed=""{relId}""/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>" +
            $@"<xdr:spPr><a:xfrm xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main""><a:off x=""0"" y=""0""/><a:ext cx=""{extCx}"" cy=""{extCy}""/></a:xfrm><a:prstGeom xmlns:a=""http://schemas.openxmlformats.org/drawingml/2006/main"" prst=""rect""><a:avLst/></a:prstGeom></xdr:spPr>" +
            "</xdr:pic>" +
            "<xdr:clientData/>" +
            "</xdr:oneCellAnchor>";

        var drawingXml = ReadEntry(archive, "xl/drawings/drawing1.xml");
        drawingXml = drawingXml.Replace("</xdr:wsDr>", anchor + "</xdr:wsDr>");
        WriteEntry(archive, "xl/drawings/drawing1.xml", drawingXml);
    }

    /// <summary>
    /// Dónde está el renglón del pad de firma, como fracción de su alto. Tiene que coincidir con
    /// LINEA_FIRMA en frontend/src/components/portal/SignaturePad.tsx.
    /// </summary>
    private const double LineaFirmaFraccion = 0.72;

    /// <summary>
    /// Recorta el PNG de la firma al trazo (con un margen mínimo) y dice a qué altura del recorte
    /// queda la línea de la ficha.
    ///
    /// La línea es el renglón del pad; si el trazo quedó entero por encima de él (firmas guardadas
    /// antes de que existiera el renglón, o quien firmó "en el aire"), la línea se pone al pie del
    /// trazo, para que nunca quede flotando lejos de la línea. Null si el PNG no se puede leer o
    /// está en blanco: entonces se usa tal cual, como antes.
    /// </summary>
    private static (byte[] Png, int LineaPx)? RecortarFirma(byte[] png)
    {
        try
        {
            using var img = SixLabors.ImageSharp.Image.Load<SixLabors.ImageSharp.PixelFormats.Rgba32>(png);
            int minX = img.Width, minY = img.Height, maxX = -1, maxY = -1;
            img.ProcessPixelRows(filas =>
            {
                for (var y = 0; y < filas.Height; y++)
                {
                    var fila = filas.GetRowSpan(y);
                    for (var x = 0; x < fila.Length; x++)
                    {
                        // Tinta: opaca y oscura. Así sirve tanto para el lienzo transparente del pad
                        // como para una firma que llegara sobre fondo blanco.
                        var p = fila[x];
                        if (p.A < 60 || (p.R > 220 && p.G > 220 && p.B > 220)) continue;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            });
            if (maxX < 0) return null;

            var margen = Math.Max(2, img.Height / 60);
            var x0 = Math.Max(0, minX - margen);
            var y0 = Math.Max(0, minY - margen);
            var x1 = Math.Min(img.Width - 1, maxX + margen);
            var y1 = Math.Min(img.Height - 1, maxY + margen);

            var lineaLienzo = (int)Math.Round(img.Height * LineaFirmaFraccion);
            var lineaPx = Math.Clamp(Math.Min(lineaLienzo, maxY) - y0, 1, y1 - y0 + 1);

            img.Mutate(c => c.Crop(new SixLabors.ImageSharp.Rectangle(x0, y0, x1 - x0 + 1, y1 - y0 + 1)));
            using var ms = new MemoryStream();
            img.SaveAsPng(ms);
            return (ms.ToArray(), lineaPx);
        }
        catch (Exception)
        {
            return null;
        }
    }

    /// <summary>Reads width/height straight from a PNG's IHDR chunk (bytes 16-23, big-endian). Returns (0, 0) if it doesn't look like a PNG.</summary>
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
