using System.IO.Compression;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;

namespace UmesIsel.Api.Services;

/// <summary>
/// Llena Resources/CartaCompromisoTemplate.xlsx con los datos de una
/// <see cref="CartaCompromisoDto"/> — misma técnica que <see cref="FichaXlsxBuilder"/>, vía el
/// helper compartido <see cref="XlsxCellSurgery"/>. Las casillas del checklist reflejan qué
/// documentos ya subió el aspirante (<see cref="DocumentoTipos"/>), no solo una intención escrita —
/// así la hoja impresa dice de un vistazo qué falta entregar en papel.
/// </summary>
public class CartaCompromisoXlsxBuilder
{
    private readonly string _templatePath;

    public CartaCompromisoXlsxBuilder(IWebHostEnvironment env)
    {
        _templatePath = Path.Combine(env.ContentRootPath, "Resources", "CartaCompromisoTemplate.xlsx");
    }

    // ---- Mapa de celdas -------------------------------------------------------------------
    // Filas tal como las escribe tools/xlsx-templates/build.mjs (hoja "CartaCompromiso"):
    //   Fila 6:  fecha (C6:E6)
    //   Fila 11: carrera (A11:H11)
    //   Filas 13-16: checklist nacional (DPI, fotos, título medio, título licenciatura)
    //   Filas 19-22: checklist extranjero (pasaporte, fotos, título medio, título pre-grado)
    //   Fila 31: Nombre completo (A31:D31) — No. DPI (E31:H31)
    //   Fila 35: caja de firma (A35:D35, fila 0-index 34, columna 0-index 0)
    public byte[] Build(CartaCompromisoDto c, IReadOnlySet<string> documentosSubidos)
    {
        var templateBytes = File.ReadAllBytes(_templatePath);
        using var output = new MemoryStream();
        output.Write(templateBytes, 0, templateBytes.Length);
        output.Position = 0;

        using (var archive = new ZipArchive(output, ZipArchiveMode.Update, leaveOpen: true))
        {
            var sheetXml = XlsxCellSurgery.ReadEntry(archive, "xl/worksheets/sheet1.xml");
            sheetXml = ApplyCellValues(sheetXml, c, documentosSubidos);
            sheetXml = XlsxCellSurgery.ForceFitToOnePage(sheetXml);
            XlsxCellSurgery.WriteEntry(archive, "xl/worksheets/sheet1.xml", sheetXml);

            if (!string.IsNullOrWhiteSpace(c.FirmaBase64))
            {
                XlsxCellSurgery.InsertSignatureImage(
                    archive, c.FirmaBase64,
                    anchorColZeroBased: 0, anchorRowZeroBased: 34,
                    boxWidthEmu: 3_600_000, boxHeightEmu: 260_000,
                    mediaEntryName: "xl/media/imageFirma.png", relId: "rIdFirma");
            }
        }

        return output.ToArray();
    }

    // El proyecto corre con <InvariantGlobalization> (ver el .csproj) para no depender de ICU en el
    // servidor, así que no hay CultureInfo "es-GT" disponible — de ahí el arreglo manual en vez de
    // ToString("dd 'de' MMMM 'de' yyyy", new CultureInfo("es-GT")).
    private static readonly string[] MesesEs =
    {
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    };

    private static string FechaEnEspanol(DateOnly fecha) => $"{fecha.Day} de {MesesEs[fecha.Month - 1]} de {fecha.Year}";

    private static string ApplyCellValues(string xml, CartaCompromisoDto c, IReadOnlySet<string> subidos)
    {
        xml = XlsxCellSurgery.SetCell(xml, "C6", FechaEnEspanol(c.Fecha));
        xml = XlsxCellSurgery.SetCell(xml, "A11", c.Carrera);

        xml = XlsxCellSurgery.SetChecked(xml, "A13", "Fotocopia de DPI autenticada", subidos.Contains(DocumentoTipos.DpiAutenticado));
        xml = XlsxCellSurgery.SetChecked(xml, "A14", "2 fotografías en blanco y negro de 3x4 cm impresas en papel mate", subidos.Contains(DocumentoTipos.Fotos));
        xml = XlsxCellSurgery.SetChecked(xml, "A15", "Fotocopia autenticada del Título Nivel Medio", subidos.Contains(DocumentoTipos.TituloMedio));
        xml = XlsxCellSurgery.SetChecked(xml, "A16", "Fotocopia autenticada del Título de Licenciatura", subidos.Contains(DocumentoTipos.TituloLicenciatura));

        xml = XlsxCellSurgery.SetChecked(xml, "A19", "Fotocopia de Pasaporte completo autenticado", subidos.Contains(DocumentoTipos.PasaporteCompleto));
        xml = XlsxCellSurgery.SetChecked(xml, "A20", "2 fotografías en blanco y negro de 3x4 cm impresas en papel mate", subidos.Contains(DocumentoTipos.FotosExtranjero));
        xml = XlsxCellSurgery.SetChecked(xml, "A21", "Fotocopia del Título a Nivel Medio autenticado, apostillado y con equiparación por el Ministerio de Educación.", subidos.Contains(DocumentoTipos.TituloMedioExtranjero));
        xml = XlsxCellSurgery.SetChecked(xml, "A22", "Fotocopia del Título de Pre-Grado autenticado y apostillado", subidos.Contains(DocumentoTipos.TituloPregrado));

        xml = XlsxCellSurgery.SetCell(xml, "A31", c.NombreCompleto);
        xml = XlsxCellSurgery.SetCell(xml, "E31", c.NoDpi);

        return xml;
    }
}
