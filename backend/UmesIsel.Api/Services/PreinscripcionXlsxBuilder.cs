using System.IO.Compression;
using UmesIsel.Api.Models.Dtos;

namespace UmesIsel.Api.Services;

/// <summary>
/// Llena Resources/PreinscripcionTemplate.xlsx (generada por tools/xlsx-templates/build.mjs) con los
/// datos de una <see cref="PreinscripcionDto"/> — misma técnica que <see cref="FichaXlsxBuilder"/>,
/// vía el helper compartido <see cref="XlsxCellSurgery"/>.
/// </summary>
public class PreinscripcionXlsxBuilder
{
    private readonly string _templatePath;

    public PreinscripcionXlsxBuilder(IWebHostEnvironment env)
    {
        _templatePath = Path.Combine(env.ContentRootPath, "Resources", "PreinscripcionTemplate.xlsx");
    }

    // ---- Mapa de celdas -------------------------------------------------------------------
    // Filas/columnas tal como las escribe tools/xlsx-templates/build.mjs (hoja "Preinscripcion"):
    //   Fila 5:  Nombre Completo (C5:H5)
    //   Fila 6:  DPI (C6:D6) — No. De Pasaporte (G6:H6)
    //   Fila 7:  Carrera (C7:H7)
    //   Fila 8:  Jornada (C8:D8) — Fecha de Nacimiento (G8:H8)
    //   Fila 9:  Género (C9:D9) — Lugar de Nacimiento (G9:H9)
    //   Fila 10: Nacionalidad (C10:D10) — Estado Civil (G10:H10)
    //   Fila 11: Dirección Completa (C11:H11)
    //   Fila 12: Departamento (C12:D12) — Municipio (G12:H12)
    //   Fila 13: Comunidad Lingüística (C13:D13) — Idioma Materno (G13:H13)
    //   Filas 14-15: Pueblo de Pertenencia — casillas "[ ] Opción" en C14/D14/E14/C15/D15/E15
    //   Fila 16: Correo Electrónico (C16:H16)
    //   Fila 17: Teléfono — Celular (D17:E17) / Casa (G17:H17)
    //   Fila 18: Contacto de Emergencia 1 — Nombre (D18:E18) / Teléfono (G18:H18)
    //   Fila 19: Contacto de Emergencia 2 — Nombre (D19:E19) / Teléfono (G19:H19)
    //   Fila 20: ¿Alergia? — casillas C20/D20, Describa en F20:H20
    //   Fila 21: ¿Problema de salud? — casillas C21/D21, Describa en F21:H21
    //   Fila 23: caja de firma (B23:E23, fila 0-index 22, columna 0-index 1)
    public byte[] Build(PreinscripcionDto p)
    {
        var templateBytes = File.ReadAllBytes(_templatePath);
        using var output = new MemoryStream();
        output.Write(templateBytes, 0, templateBytes.Length);
        output.Position = 0;

        using (var archive = new ZipArchive(output, ZipArchiveMode.Update, leaveOpen: true))
        {
            var sheetXml = XlsxCellSurgery.ReadEntry(archive, "xl/worksheets/sheet1.xml");
            sheetXml = ApplyCellValues(sheetXml, p);
            sheetXml = XlsxCellSurgery.ForceFitToOnePage(sheetXml);
            XlsxCellSurgery.WriteEntry(archive, "xl/worksheets/sheet1.xml", sheetXml);

            if (!string.IsNullOrWhiteSpace(p.FirmaBase64))
            {
                XlsxCellSurgery.InsertSignatureImage(
                    archive, p.FirmaBase64,
                    anchorColZeroBased: 1, anchorRowZeroBased: 22,
                    boxWidthEmu: 3_400_000, boxHeightEmu: 300_000,
                    mediaEntryName: "xl/media/imageFirma.png", relId: "rIdFirma");
            }
        }

        return output.ToArray();
    }

    private static string ApplyCellValues(string xml, PreinscripcionDto p)
    {
        xml = XlsxCellSurgery.SetCell(xml, "C5", p.NombreCompleto);
        xml = XlsxCellSurgery.SetCell(xml, "C6", p.Dpi);
        xml = XlsxCellSurgery.SetCell(xml, "G6", p.NoPasaporte);
        xml = XlsxCellSurgery.SetCell(xml, "C7", p.Carrera);
        xml = XlsxCellSurgery.SetCell(xml, "C8", p.Jornada);
        xml = XlsxCellSurgery.SetCell(xml, "G8", p.FechaNacimiento?.ToString("dd/MM/yyyy"));
        xml = XlsxCellSurgery.SetCell(xml, "C9", p.Genero);
        xml = XlsxCellSurgery.SetCell(xml, "G9", p.LugarNacimiento);
        xml = XlsxCellSurgery.SetCell(xml, "C10", p.Nacionalidad);
        xml = XlsxCellSurgery.SetCell(xml, "G10", p.EstadoCivil);
        xml = XlsxCellSurgery.SetCell(xml, "C11", p.DireccionCompleta);
        xml = XlsxCellSurgery.SetCell(xml, "C12", p.Departamento);
        xml = XlsxCellSurgery.SetCell(xml, "G12", p.Municipio);
        xml = XlsxCellSurgery.SetCell(xml, "C13", p.ComunidadLinguistica);
        xml = XlsxCellSurgery.SetCell(xml, "G13", p.IdiomaMaterno);

        xml = XlsxCellSurgery.SetChecked(xml, "C14", "Maya", p.PuebloPertenencia == "Maya");
        xml = XlsxCellSurgery.SetChecked(xml, "D14", "Garífuna", p.PuebloPertenencia == "Garifuna");
        xml = XlsxCellSurgery.SetChecked(xml, "E14", "Extranjero", p.PuebloPertenencia == "Extranjero");
        xml = XlsxCellSurgery.SetChecked(xml, "C15", "Xinka", p.PuebloPertenencia == "Xinka");
        xml = XlsxCellSurgery.SetChecked(xml, "D15", "Ladino", p.PuebloPertenencia == "Ladino");
        xml = XlsxCellSurgery.SetChecked(xml, "E15", "Afroascendiente/Creole/Afromestizo", p.PuebloPertenencia == "Afroascendiente");

        xml = XlsxCellSurgery.SetCell(xml, "C16", p.CorreoElectronico);
        xml = XlsxCellSurgery.SetCell(xml, "D17", p.TelefonoCelular);
        xml = XlsxCellSurgery.SetCell(xml, "G17", p.TelefonoCasa);
        xml = XlsxCellSurgery.SetCell(xml, "D18", p.Emergencia1Nombre);
        xml = XlsxCellSurgery.SetCell(xml, "G18", p.Emergencia1Telefono);
        xml = XlsxCellSurgery.SetCell(xml, "D19", p.Emergencia2Nombre);
        xml = XlsxCellSurgery.SetCell(xml, "G19", p.Emergencia2Telefono);

        xml = XlsxCellSurgery.SetChecked(xml, "C20", "Sí", p.TieneAlergia);
        xml = XlsxCellSurgery.SetChecked(xml, "D20", "No", !p.TieneAlergia);
        xml = XlsxCellSurgery.SetCell(xml, "F20", p.AlergiaDescripcion);

        xml = XlsxCellSurgery.SetChecked(xml, "C21", "Sí", p.TieneProblemaSalud);
        xml = XlsxCellSurgery.SetChecked(xml, "D21", "No", !p.TieneProblemaSalud);
        xml = XlsxCellSurgery.SetCell(xml, "F21", p.SaludDescripcion);

        return xml;
    }
}
