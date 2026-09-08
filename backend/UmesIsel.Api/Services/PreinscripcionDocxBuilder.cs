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
            MarcarCasillas(archive, p);
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

        // Las marcas NO se escriben aquí: los recuadros de esta ficha son imágenes flotantes con
        // posición absoluta, así que un "✓" de texto al lado de la etiqueta caía fuera del recuadro.
        // Se marcan cambiando la imagen de la casilla (ver MarcarCasillas); estos tokens solo se
        // limpian.
        foreach (var marca in new[]
                 {
                     "PUEBLO_MAYA", "PUEBLO_GARIFUNA", "PUEBLO_EXTRANJERO", "PUEBLO_XINKA", "PUEBLO_LADINO",
                     "PUEBLO_AFRO", "ALERGIA_SI", "ALERGIA_NO", "SALUD_SI", "SALUD_NO",
                 })
        {
            xml = DocxCellSurgery.ReplaceToken(xml, marca, null);
        }

        // Estos van pegados justo tras su etiqueta ("Celular:", "Nombre:"…) — un espacio antes los separa.
        xml = DocxCellSurgery.ReplaceToken(xml, "TELEFONO_CELULAR", Prefixed(p.TelefonoCelular));
        xml = DocxCellSurgery.ReplaceToken(xml, "TELEFONO_CASA", Prefixed(p.TelefonoCasa));
        xml = DocxCellSurgery.ReplaceToken(xml, "EMERGENCIA1_NOMBRE", Prefixed(p.Emergencia1Nombre));
        xml = DocxCellSurgery.ReplaceToken(xml, "EMERGENCIA1_TELEFONO", Prefixed(p.Emergencia1Telefono));
        xml = DocxCellSurgery.ReplaceToken(xml, "EMERGENCIA2_NOMBRE", Prefixed(p.Emergencia2Nombre));
        xml = DocxCellSurgery.ReplaceToken(xml, "EMERGENCIA2_TELEFONO", Prefixed(p.Emergencia2Telefono));

        xml = DocxCellSurgery.ReplaceToken(xml, "ALERGIA_DESCRIPCION", Prefixed(p.AlergiaDescripcion));
        xml = DocxCellSurgery.ReplaceToken(xml, "SALUD_DESCRIPCION", Prefixed(p.SaludDescripcion));

        return xml;
    }

    // El FORMATO dibuja sus casillas con dos recuadros de distinto tamaño: uno para casi todas
    // (image4.png) y otro un poco mayor para "Extranjero" y "Afroascendiente" (image5.png). Cada uno
    // tiene su propio PNG marcado — el mismo recuadro con la X dentro — para que la casilla marcada
    // calce pixel a pixel con la vacía.
    private const string CasillaMarcadaChica = "media/casillaMarcada4.png";
    private const string CasillaMarcadaGrande = "media/casillaMarcada5.png";

    private static void MarcarCasillas(ZipArchive archive, PreinscripcionDto p)
    {
        DocxCellSurgery.SetCheckboxes(archive, new Dictionary<string, bool>
        {
            ["rIdChkPuebloMaya"] = p.PuebloPertenencia == "Maya",
            ["rIdChkPuebloGarifuna"] = p.PuebloPertenencia == "Garifuna",
            ["rIdChkPuebloXinka"] = p.PuebloPertenencia == "Xinka",
            ["rIdChkPuebloLadino"] = p.PuebloPertenencia == "Ladino",
            ["rIdChkAlergiaSi"] = p.TieneAlergia,
            ["rIdChkAlergiaNo"] = !p.TieneAlergia,
            ["rIdChkSaludSi"] = p.TieneProblemaSalud,
            ["rIdChkSaludNo"] = !p.TieneProblemaSalud,
        }, CasillaMarcadaChica);

        DocxCellSurgery.SetCheckboxes(archive, new Dictionary<string, bool>
        {
            ["rIdChkPuebloExtranjero"] = p.PuebloPertenencia == "Extranjero",
            ["rIdChkPuebloAfro"] = p.PuebloPertenencia == "Afroascendiente",
        }, CasillaMarcadaGrande);
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
