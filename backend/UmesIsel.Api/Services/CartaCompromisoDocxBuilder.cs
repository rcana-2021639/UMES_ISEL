using System.IO.Compression;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;

namespace UmesIsel.Api.Services;

/// <summary>
/// Llena Resources/CartaCompromisoTemplate.docx (el FORMATO real, preparado con tokens — ver
/// DocxCellSurgery) con los datos de una <see cref="CartaCompromisoDto"/>. Las marcas del checklist
/// reflejan qué documentos ya subió el aspirante (<see cref="DocumentoTipos"/>), no solo una
/// intención escrita.
/// </summary>
public class CartaCompromisoDocxBuilder
{
    private readonly string _templatePath;

    public CartaCompromisoDocxBuilder(IWebHostEnvironment env)
    {
        _templatePath = Path.Combine(env.ContentRootPath, "Resources", "CartaCompromisoTemplate.docx");
    }

    // El proyecto corre con <InvariantGlobalization> (ver el .csproj), así que no hay CultureInfo
    // "es-GT" disponible para formatear la fecha en español — de ahí la tabla manual.
    private static readonly string[] MesesEs =
    {
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    };

    private static string FechaEnEspanol(DateOnly fecha) => $"{fecha.Day} de {MesesEs[fecha.Month - 1]} de {fecha.Year}";

    public byte[] Build(CartaCompromisoDto c, IReadOnlySet<string> documentosSubidos)
    {
        var templateBytes = File.ReadAllBytes(_templatePath);
        using var output = new MemoryStream();
        output.Write(templateBytes, 0, templateBytes.Length);
        output.Position = 0;

        using (var archive = new ZipArchive(output, ZipArchiveMode.Update, leaveOpen: true))
        {
            var xml = DocxCellSurgery.ReadEntry(archive, "word/document.xml");
            xml = ApplyTokens(xml, c, documentosSubidos);
            xml = string.IsNullOrWhiteSpace(c.FirmaBase64)
                ? DocxCellSurgery.ReplaceToken(xml, "FIRMA", null)
                : DocxCellSurgery.InsertSignatureImage(archive, xml, "FIRMA", c.FirmaBase64, BuildFirmaPosition);
            DocxCellSurgery.WriteEntry(archive, "word/document.xml", xml);
        }

        return output.ToArray();
    }

    private static string ApplyTokens(string xml, CartaCompromisoDto c, IReadOnlySet<string> subidos)
    {
        xml = DocxCellSurgery.ReplaceToken(xml, "FECHA", FechaEnEspanol(c.Fecha));
        xml = DocxCellSurgery.ReplaceToken(xml, "CARRERA", c.Carrera);
        xml = DocxCellSurgery.ReplaceToken(xml, "NOMBRE_COMPLETO", c.NombreCompleto);
        xml = DocxCellSurgery.ReplaceToken(xml, "NO_DPI", c.NoDpi);

        xml = DocxCellSurgery.ReplaceCheckToken(xml, "DOC_DPI", subidos.Contains(DocumentoTipos.DpiAutenticado));
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "DOC_FOTOS", subidos.Contains(DocumentoTipos.Fotos));
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "DOC_TITULO_MEDIO", subidos.Contains(DocumentoTipos.TituloMedio));
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "DOC_TITULO_LICENCIATURA", subidos.Contains(DocumentoTipos.TituloLicenciatura));
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "DOC_PASAPORTE", subidos.Contains(DocumentoTipos.PasaporteCompleto));
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "DOC_FOTOS_EXTRANJERO", subidos.Contains(DocumentoTipos.FotosExtranjero));
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "DOC_TITULO_MEDIO_EXTRANJERO", subidos.Contains(DocumentoTipos.TituloMedioExtranjero));
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "DOC_TITULO_PREGRADO", subidos.Contains(DocumentoTipos.TituloPregrado));

        return xml;
    }

    // Esta plantilla no tiene una línea dibujada de la que tomar coordenadas (el renglón "F. ___" es
    // texto plano) — se centra la firma en el ancho de la hoja (Letter, 12240 twips) y se ancla justo
    // arriba del renglón, en el espacio en blanco que ya existe entre "Atentamente," y "F. ___".
    private const long PageWidthEmu = 7_772_400; // 12240 twips * 635 EMU/twip
    private const long FirmaBottomOffsetEmu = -60_000; // apoyada casi sobre el propio renglón "F."

    private static string BuildFirmaPosition(long cx, long cy)
    {
        var left = (PageWidthEmu - cx) / 2;
        var top = FirmaBottomOffsetEmu - cy;
        return $@"<wp:positionH relativeFrom=""page""><wp:posOffset>{left}</wp:posOffset></wp:positionH><wp:positionV relativeFrom=""paragraph""><wp:posOffset>{top}</wp:posOffset></wp:positionV>";
    }
}
