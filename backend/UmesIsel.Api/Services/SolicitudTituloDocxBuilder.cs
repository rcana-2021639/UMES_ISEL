using System.IO.Compression;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;

namespace UmesIsel.Api.Services;

/// <summary>
/// Llena Resources/SolicitudTituloTemplate.docx (el FORMATO real, preparado con tokens — ver
/// DocxCellSurgery y tools/docx-templates/prepare-solicitud-titulo.mjs) con una
/// <see cref="SolicitudTituloDto"/>.
///
/// Esta ficha tiene tres cosas que las de Inscripción no tienen:
///
///   1. El carné, los nombres y los apellidos van LETRA POR LETRA, uno por casilla de rejillas de
///      13, 37 y 37. <see cref="Rejilla"/> reparte el texto y lo recorta si no cabe — nunca lo
///      desborda a la casilla siguiente ni empuja el diseño.
///   2. Las casillas de opción son imágenes; se marcan cambiando su relación
///      (<see cref="DocxCellSurgery.SetCheckboxes"/>), no escribiendo un "✓" al lado.
///   3. Lleva fotografía. Va como imagen flotante encajada en el recuadro "PEGAR FOTOGRAFÍA
///      RECIENTE", cuyas coordenadas se leen del propio FORMATO (ver las constantes de abajo).
/// </summary>
public class SolicitudTituloDocxBuilder
{
    private readonly string _templatePath;

    public SolicitudTituloDocxBuilder(IWebHostEnvironment env)
    {
        _templatePath = Path.Combine(env.ContentRootPath, "Resources", "SolicitudTituloTemplate.docx");
    }

    /// <summary>Casillas de la rejilla de cada campo — son las que trae el FORMATO, no una elección nuestra.</summary>
    public const int CasillasCarnet = 13;
    public const int CasillasNombres = 37;
    public const int CasillasApellidos = 37;

    // El recuadro "PEGAR FOTOGRAFÍA RECIENTE" del FORMATO: Textbox 12, anclado a la página en
    // horizontal y al párrafo que lo hospeda en vertical, con un borde de 19050 EMU (1.5 pt).
    // La foto se mete DENTRO de ese borde (de ahí el margen), en el mismo párrafo, para poder
    // reutilizar tal cual estas coordenadas.
    private const long FotoCajaLeftEmu = 6_198_615;
    private const long FotoCajaTopEmu = -752_552;
    private const long FotoCajaWidthEmu = 1_285_875;
    private const long FotoCajaHeightEmu = 1_637_030;
    private const long FotoMargenEmu = 38_100; // 2 x el grosor del borde, para no taparlo

    /// <summary>Proporción exacta del recuadro (ancho/alto ≈ 0.785, es decir 3.5 x 4.5 cm) — el recorte del frontend usa esta misma cifra.</summary>
    public const double FotoAspecto = (double)FotoCajaWidthEmu / FotoCajaHeightEmu;

    // El renglón de "Firma del Interesado:". No se puede deducir de Textbox 24 (que es el que lo
    // dibuja): ese textbox abarca también la etiqueta, así que centrar la firma en él la dejaba
    // encima del texto. Estas cuatro cifras salen de MEDIR el FORMATO renderizado a 96 ppp: el
    // renglón va de x=614 a x=778 px y cae 17.8 px por debajo del origen de su párrafo
    // (614 px / 96 ppp * 914400 EMU/pulgada = 5850000, y así el resto).
    private const long FirmaLineaLeftEmu = 5_850_000;
    private const long FirmaLineaWidthEmu = 1_555_000;
    private const long FirmaLineaBottomEmu = 169_000;
    private const long FirmaAltoMaxEmu = 330_000;

    public byte[] Build(SolicitudTituloDto s)
    {
        var templateBytes = File.ReadAllBytes(_templatePath);
        using var output = new MemoryStream();
        output.Write(templateBytes, 0, templateBytes.Length);
        output.Position = 0;

        using (var archive = new ZipArchive(output, ZipArchiveMode.Update, leaveOpen: true))
        {
            var xml = DocxCellSurgery.ReadEntry(archive, "word/document.xml");
            xml = ApplyTokens(xml, s);

            // Las casillas primero: reescriben el .rels entero, y las imágenes de abajo le añaden
            // relaciones nuevas — al revés se perderían.
            DocxCellSurgery.SetCheckboxes(archive, Casillas(s));

            xml = string.IsNullOrWhiteSpace(s.FotoBase64)
                ? DocxCellSurgery.ReplaceToken(xml, "FOTO", null)
                : DocxCellSurgery.InsertFloatingImage(
                    archive, xml, "FOTO", s.FotoBase64, "imageFoto", "rIdFotoTitulo", 9101, "Fotografía",
                    FotoCajaWidthEmu - 2 * FotoMargenEmu, FotoCajaHeightEmu - 2 * FotoMargenEmu, BuildFotoPosition);

            xml = string.IsNullOrWhiteSpace(s.FirmaBase64)
                ? DocxCellSurgery.ReplaceToken(xml, "FIRMA", null)
                : DocxCellSurgery.InsertFloatingImage(
                    archive, xml, "FIRMA", s.FirmaBase64, "imageFirmaTitulo", "rIdFirmaTitulo", 9102, "Firma",
                    FirmaLineaWidthEmu, FirmaAltoMaxEmu, BuildFirmaPosition);

            DocxCellSurgery.WriteEntry(archive, "word/document.xml", xml);
        }

        return output.ToArray();
    }

    private static string ApplyTokens(string xml, SolicitudTituloDto s)
    {
        xml = DocxCellSurgery.ReplaceToken(xml, "SOL_DIA", s.FechaSolicitud.ToString("dd"));
        xml = DocxCellSurgery.ReplaceToken(xml, "SOL_MES", s.FechaSolicitud.ToString("MM"));
        xml = DocxCellSurgery.ReplaceToken(xml, "SOL_ANIO", s.FechaSolicitud.ToString("yyyy"));

        xml = Rejilla(xml, "C", CasillasCarnet, s.Carnet);
        xml = Rejilla(xml, "N", CasillasNombres, s.Nombres);
        xml = Rejilla(xml, "A", CasillasApellidos, s.Apellidos);

        xml = DocxCellSurgery.ReplaceToken(xml, "NAC_DIA", s.FechaNacimiento?.ToString("dd"));
        xml = DocxCellSurgery.ReplaceToken(xml, "NAC_MES", s.FechaNacimiento?.ToString("MM"));
        xml = DocxCellSurgery.ReplaceToken(xml, "NAC_ANIO", s.FechaNacimiento?.ToString("yyyy"));

        xml = DocxCellSurgery.ReplaceToken(xml, "ESTADO_CIVIL", s.EstadoCivil);
        xml = DocxCellSurgery.ReplaceToken(xml, "DIRECCION", s.DireccionDomicilio);
        xml = DocxCellSurgery.ReplaceToken(xml, "TEL_CASA", s.TelefonoDomicilio);
        xml = DocxCellSurgery.ReplaceToken(xml, "TEL_CELULAR", s.TelefonoCelular);
        xml = DocxCellSurgery.ReplaceToken(xml, "TEL_EMERGENCIA", s.TelefonoEmergencia);
        xml = DocxCellSurgery.ReplaceToken(xml, "CORREO", s.CorreoElectronico);
        xml = DocxCellSurgery.ReplaceToken(xml, "EMPRESA", s.Empresa);
        xml = DocxCellSurgery.ReplaceToken(xml, "CARGO", s.Cargo);
        xml = DocxCellSurgery.ReplaceToken(xml, "DIRECCION_TRABAJO", s.DireccionTrabajo);
        xml = DocxCellSurgery.ReplaceToken(xml, "TEL_TRABAJO", s.TelefonoTrabajo);
        xml = DocxCellSurgery.ReplaceToken(xml, "FACULTAD", s.FacultadDepartamento);
        xml = DocxCellSurgery.ReplaceToken(xml, "TITULO_OBTENER", s.TituloObtener);

        return xml;
    }

    /// <summary>
    /// Reparte un texto carácter a carácter entre las casillas <c>{{prefijo0}}…{{prefijoN-1}}</c>.
    /// Lo que no cabe se descarta: la rejilla es de ancho fijo y meter dos letras en una casilla se
    /// vería peor que truncar (el formulario ya avisa al alumno de cuántas casillas tiene).
    /// </summary>
    private static string Rejilla(string xml, string prefijo, int casillas, string? texto)
    {
        var chars = (texto ?? string.Empty).ToCharArray();
        for (var i = 0; i < casillas; i++)
        {
            xml = DocxCellSurgery.ReplaceToken(xml, $"{prefijo}{i}", i < chars.Length ? chars[i].ToString() : null);
        }
        return xml;
    }

    /// <summary>Qué casilla-imagen queda marcada. Los ids los pone la plantilla preparada.</summary>
    private static Dictionary<string, bool> Casillas(SolicitudTituloDto s) => new()
    {
        ["rIdChkCampusCentral"] = s.Campus == CampusSolicitud.Central,
        ["rIdChkCampusQuetzaltenango"] = s.Campus == CampusSolicitud.Quetzaltenango,
        ["rIdChkCampusSalesiano"] = s.Campus == CampusSolicitud.CentroSalesiano,
        ["rIdChkCampusAltaVerapaz"] = s.Campus == CampusSolicitud.AltaVerapaz,
        ["rIdChkCampusMorales"] = s.Campus == CampusSolicitud.Morales,
        ["rIdChkCampusHonduras"] = s.Campus == CampusSolicitud.Honduras,
        ["rIdChkCeremoniaSi"] = s.ParticipaCeremonia,
        ["rIdChkCeremoniaNo"] = !s.ParticipaCeremonia,
        ["rIdChkSexoF"] = s.Sexo == "F",
        ["rIdChkSexoM"] = s.Sexo == "M",
    };

    private static string BuildFotoPosition(long cx, long cy)
    {
        // Centrada dentro del recuadro, por si la proporción no calzara exactamente.
        var left = FotoCajaLeftEmu + (FotoCajaWidthEmu - cx) / 2;
        var top = FotoCajaTopEmu + (FotoCajaHeightEmu - cy) / 2;
        return $@"<wp:positionH relativeFrom=""page""><wp:posOffset>{left}</wp:posOffset></wp:positionH><wp:positionV relativeFrom=""paragraph""><wp:posOffset>{top}</wp:posOffset></wp:positionV>";
    }

    private static string BuildFirmaPosition(long cx, long cy)
    {
        // Centrada en el renglón y apoyada justo encima de él (esos 15000 EMU son ~0.4 mm de aire,
        // para que el trazo no se coma la propia raya).
        var left = FirmaLineaLeftEmu + (FirmaLineaWidthEmu - cx) / 2;
        var top = FirmaLineaBottomEmu - cy - 15_000;
        return $@"<wp:positionH relativeFrom=""page""><wp:posOffset>{left}</wp:posOffset></wp:positionH><wp:positionV relativeFrom=""paragraph""><wp:posOffset>{top}</wp:posOffset></wp:positionV>";
    }
}
