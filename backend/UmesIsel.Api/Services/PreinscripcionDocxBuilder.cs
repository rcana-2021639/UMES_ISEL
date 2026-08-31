using System.IO.Compression;
using UmesIsel.Api.Models.Dtos;

namespace UmesIsel.Api.Services;

/// <summary>
/// Llena Resources/PreinscripcionTemplate.docx (el FORMATO real, preparado con tokens — ver
/// DocxCellSurgery) con los datos de una <see cref="PreinscripcionDto"/>.
/// </summary>
public class PreinscripcionDocxBuilder
{
    private readonly string _templatePath;

    public PreinscripcionDocxBuilder(IWebHostEnvironment env)
    {
        _templatePath = Path.Combine(env.ContentRootPath, "Resources", "PreinscripcionTemplate.docx");
    }

    public byte[] Build(PreinscripcionDto p)
    {
        var templateBytes = File.ReadAllBytes(_templatePath);
        using var output = new MemoryStream();
        output.Write(templateBytes, 0, templateBytes.Length);
        output.Position = 0;

        using (var archive = new ZipArchive(output, ZipArchiveMode.Update, leaveOpen: true))
        {
            var xml = DocxCellSurgery.ReadEntry(archive, "word/document.xml");
            xml = ApplyTokens(xml, p);
            xml = string.IsNullOrWhiteSpace(p.FirmaBase64)
                ? DocxCellSurgery.ReplaceToken(xml, "FIRMA", null)
                : DocxCellSurgery.InsertSignatureImage(archive, xml, "FIRMA", p.FirmaBase64, BuildFirmaPosition);
            DocxCellSurgery.WriteEntry(archive, "word/document.xml", xml);
        }

        return output.ToArray();
    }

    private static string ApplyTokens(string xml, PreinscripcionDto p)
    {
        xml = DocxCellSurgery.ReplaceToken(xml, "NOMBRE_COMPLETO", p.NombreCompleto);
        xml = DocxCellSurgery.ReplaceToken(xml, "DPI", p.Dpi);
        xml = DocxCellSurgery.ReplaceToken(xml, "NO_PASAPORTE", p.NoPasaporte);
        xml = DocxCellSurgery.ReplaceToken(xml, "CARRERA", p.Carrera);
        xml = DocxCellSurgery.ReplaceToken(xml, "JORNADA", p.Jornada);
        xml = DocxCellSurgery.ReplaceToken(xml, "FECHA_NACIMIENTO", p.FechaNacimiento?.ToString("dd/MM/yyyy"));
        xml = DocxCellSurgery.ReplaceToken(xml, "GENERO", p.Genero);
        xml = DocxCellSurgery.ReplaceToken(xml, "LUGAR_NACIMIENTO", p.LugarNacimiento);
        xml = DocxCellSurgery.ReplaceToken(xml, "NACIONALIDAD", p.Nacionalidad);
        xml = DocxCellSurgery.ReplaceToken(xml, "DIRECCION", p.DireccionCompleta);
        xml = DocxCellSurgery.ReplaceToken(xml, "DEPARTAMENTO", p.Departamento);
        xml = DocxCellSurgery.ReplaceToken(xml, "MUNICIPIO", p.Municipio);
        xml = DocxCellSurgery.ReplaceToken(xml, "ESTADO_CIVIL", p.EstadoCivil);
        xml = DocxCellSurgery.ReplaceToken(xml, "COMUNIDAD_LINGUISTICA", p.ComunidadLinguistica);
        xml = DocxCellSurgery.ReplaceToken(xml, "IDIOMA_MATERNO", p.IdiomaMaterno);
        xml = DocxCellSurgery.ReplaceToken(xml, "CORREO", p.CorreoElectronico);

        xml = DocxCellSurgery.ReplaceCheckToken(xml, "PUEBLO_MAYA", p.PuebloPertenencia == "Maya");
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "PUEBLO_GARIFUNA", p.PuebloPertenencia == "Garifuna");
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "PUEBLO_EXTRANJERO", p.PuebloPertenencia == "Extranjero");
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "PUEBLO_XINKA", p.PuebloPertenencia == "Xinka");
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "PUEBLO_LADINO", p.PuebloPertenencia == "Ladino");
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "PUEBLO_AFRO", p.PuebloPertenencia == "Afroascendiente");

        // Estos van pegados justo tras su etiqueta ("Celular:", "Nombre:"…) — un espacio antes los separa.
        xml = DocxCellSurgery.ReplaceToken(xml, "TELEFONO_CELULAR", Prefixed(p.TelefonoCelular));
        xml = DocxCellSurgery.ReplaceToken(xml, "TELEFONO_CASA", Prefixed(p.TelefonoCasa));
        xml = DocxCellSurgery.ReplaceToken(xml, "EMERGENCIA1_NOMBRE", Prefixed(p.Emergencia1Nombre));
        xml = DocxCellSurgery.ReplaceToken(xml, "EMERGENCIA1_TELEFONO", Prefixed(p.Emergencia1Telefono));
        xml = DocxCellSurgery.ReplaceToken(xml, "EMERGENCIA2_NOMBRE", Prefixed(p.Emergencia2Nombre));
        xml = DocxCellSurgery.ReplaceToken(xml, "EMERGENCIA2_TELEFONO", Prefixed(p.Emergencia2Telefono));

        xml = DocxCellSurgery.ReplaceCheckToken(xml, "ALERGIA_SI", p.TieneAlergia);
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "ALERGIA_NO", !p.TieneAlergia);
        xml = DocxCellSurgery.ReplaceToken(xml, "ALERGIA_DESCRIPCION", Prefixed(p.AlergiaDescripcion));

        xml = DocxCellSurgery.ReplaceCheckToken(xml, "SALUD_SI", p.TieneProblemaSalud);
        xml = DocxCellSurgery.ReplaceCheckToken(xml, "SALUD_NO", !p.TieneProblemaSalud);
        xml = DocxCellSurgery.ReplaceToken(xml, "SALUD_DESCRIPCION", Prefixed(p.SaludDescripcion));

        return xml;
    }

    private static string? Prefixed(string? value) => string.IsNullOrEmpty(value) ? value : " " + value;

    // La línea de firma original del FORMATO está dibujada como una imagen flotante anclada a
    // relativeFrom="page" (posOffset 2902330 EMU) horizontalmente y relativeFrom="paragraph"
    // (posOffset 312684 EMU) verticalmente, con un ancho de 2147570 EMU — ver el párrafo justo
    // antes de "Firma Estudiante" en Resources/PreinscripcionTemplate.docx. La firma se centra
    // sobre ese mismo tramo y se apoya justo encima de la línea (su borde inferior queda en 312684).
    private const long LineaFirmaLeftEmu = 2_902_330;
    private const long LineaFirmaWidthEmu = 2_147_570;
    private const long LineaFirmaBottomEmu = 312_684;

    private static string BuildFirmaPosition(long cx, long cy)
    {
        var left = LineaFirmaLeftEmu + (LineaFirmaWidthEmu - cx) / 2;
        var top = LineaFirmaBottomEmu - cy;
        return $@"<wp:positionH relativeFrom=""page""><wp:posOffset>{left}</wp:posOffset></wp:positionH><wp:positionV relativeFrom=""paragraph""><wp:posOffset>{top}</wp:posOffset></wp:positionV>";
    }
}
