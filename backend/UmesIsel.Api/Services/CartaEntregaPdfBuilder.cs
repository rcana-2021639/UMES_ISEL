using System.Globalization;
using PdfSharpCore.Drawing;
using PdfSharpCore.Fonts;
using PdfSharpCore.Pdf;
using UmesIsel.Api.Models.Dtos;

namespace UmesIsel.Api.Services;

/// <summary>
/// La carta con la que ISEL entrega a Secretaría General el lote de fichas de asignación ya impresas:
/// fecha, encabezado, una tabla con cada alumno (nombre, carné, maestría, trimestre), el cierre y
/// las dos líneas de firma — la de "quien entrega" ya va firmada por el administrador (sin fecha:
/// la carta va fechada arriba).
///
/// Sustituye armar esa tabla a mano en Word cada vez que se lleva un montón de fichas: se copiaban
/// los datos fila por fila desde el panel, y bastaba un carné mal tecleado para que Secretaría
/// devolviera el lote. Se dibuja directo con PdfSharpCore (no pasa por LibreOffice): es texto y
/// una tabla, nada que necesite plantilla.
/// </summary>
public class CartaEntregaPdfBuilder
{
    private readonly FirmaAdminRenderer _firmaAdmin;

    // Letter, márgenes de una pulgada.
    private const double Ancho = 612, Alto = 792, Margen = 72;
    private const double AnchoUtil = Ancho - Margen * 2;
    private const double PieDePagina = Alto - Margen;

    // Anchos de columna: No. / Nombre / Carné / Maestría / Trimestre. Suman AnchoUtil (468).
    private static readonly double[] Columnas = { 30, 132, 66, 188, 52 };
    private const double RellenoCelda = 3;

    public CartaEntregaPdfBuilder(FirmaAdminRenderer firmaAdmin)
    {
        _firmaAdmin = firmaAdmin;
        FuenteResolver.Registrar();
    }

    /// <param name="periodo">Tal como se lee en la carta: "cuarto trimestre 2026".</param>
    public byte[] Build(IReadOnlyList<CourseAssignmentDto> fichas, string periodo, DateOnly fecha)
    {
        using var doc = new PdfDocument();
        var normal = new XFont(FuenteResolver.Familia, 10.5, XFontStyle.Regular);
        var tabla = new XFont(FuenteResolver.Familia, 9.5, XFontStyle.Regular);
        var tablaNegrita = new XFont(FuenteResolver.Familia, 9.5, XFontStyle.Bold);

        var pagina = doc.AddPage();
        pagina.Width = Ancho;
        pagina.Height = Alto;
        var gfx = XGraphics.FromPdfPage(pagina);
        var y = Margen;

        // ---- encabezado
        var fechaTexto = $"Guatemala {fecha.Day} de {NombreMes(fecha.Month)} de {fecha.Year}";
        gfx.DrawString(fechaTexto, normal, XBrushes.Black, new XRect(Margen, y, AnchoUtil, 14), XStringFormats.TopRight);
        y += 40;

        gfx.DrawString("Departamento de Secretaría General:", normal, XBrushes.Black, Margen, y + 11);
        y += 30;

        var intro = $"Por medio de la presente, ISEL hace entrega de las fichas de asignación de cursos correspondientes al {periodo} de los siguientes estudiantes:";
        y = DibujarParrafo(gfx, intro, normal, Margen, y, AnchoUtil);
        y += 18;

        // ---- tabla
        y = DibujarCabecera(gfx, tablaNegrita, y);
        var n = 0;
        foreach (var f in fichas)
        {
            n++;
            var celdas = new[] { n.ToString(), f.NombreCompleto, f.Carnet, f.Carrera, f.Trimestre.ToString() };
            var lineas = celdas.Select((t, i) => PartirLineas(gfx, t, tabla, Columnas[i] - RellenoCelda * 2)).ToArray();
            var altoFila = lineas.Max(l => l.Count) * 12 + RellenoCelda * 2;

            if (y + altoFila > PieDePagina)
            {
                (pagina, gfx) = NuevaPagina(doc);
                y = Margen;
                y = DibujarCabecera(gfx, tablaNegrita, y);
            }

            var x = Margen;
            for (var i = 0; i < celdas.Length; i++)
            {
                gfx.DrawRectangle(XPens.Black, x, y, Columnas[i], altoFila);
                var fuente = i == 2 ? tablaNegrita : tabla; // el carné en negrita, como en el formato de muestra
                var ty = y + RellenoCelda + 10;
                foreach (var linea in lineas[i])
                {
                    gfx.DrawString(linea, fuente, XBrushes.Black, x + RellenoCelda, ty);
                    ty += 12;
                }
                x += Columnas[i];
            }
            y += altoFila;
        }

        // ---- cierre y firmas: si no caben enteros, van a una hoja nueva (nunca partidos).
        const double altoCierre = 190;
        y += 36;
        if (y + altoCierre > PieDePagina)
        {
            (pagina, gfx) = NuevaPagina(doc);
            y = Margen;
        }

        gfx.DrawString("Sin otro particular, se extiende la presente para los usos correspondientes.", normal, XBrushes.Black, Margen, y + 11);
        y += 40;

        // Firma del administrador, grande, centrada sobre la primera línea.
        var anchoBloque = AnchoUtil / 2 - 20;
        var yLinea = y + 90;
        if (_firmaAdmin.Disponible)
        {
            using var ms = new MemoryStream(_firmaAdmin.RenderSoloFirma());
            using var img = XImage.FromStream(() => ms);
            const double altoFirma = 80;
            var anchoFirma = img.PixelWidth * altoFirma / img.PixelHeight;
            if (anchoFirma > anchoBloque) anchoFirma = anchoBloque;
            var altoReal = img.PixelHeight * anchoFirma / img.PixelWidth;
            gfx.DrawImage(img, Margen + (anchoBloque - anchoFirma) / 2, yLinea - altoReal - 2, anchoFirma, altoReal);
        }

        var xDerecha = Margen + AnchoUtil - anchoBloque;
        gfx.DrawLine(XPens.Gray, Margen, yLinea, Margen + anchoBloque, yLinea);
        gfx.DrawLine(XPens.Gray, xDerecha, yLinea, xDerecha + anchoBloque, yLinea);
        gfx.DrawString("Nombre y firma de quien entrega", normal, XBrushes.Black, Margen, yLinea + 16);
        gfx.DrawString("Nombre y firma de quien recibe", normal, XBrushes.Black, xDerecha, yLinea + 16);

        using var salida = new MemoryStream();
        doc.Save(salida, closeStream: false);
        return salida.ToArray();
    }

    private static (PdfPage, XGraphics) NuevaPagina(PdfDocument doc)
    {
        var p = doc.AddPage();
        p.Width = Ancho;
        p.Height = Alto;
        return (p, XGraphics.FromPdfPage(p));
    }

    private static double DibujarCabecera(XGraphics gfx, XFont fuente, double y)
    {
        var titulos = new[] { "No.", "Nombre del Alumno", "Carné", "Maestría", "Trimestre" };
        const double alto = 18;
        var x = Margen;
        for (var i = 0; i < titulos.Length; i++)
        {
            gfx.DrawRectangle(XPens.Black, x, y, Columnas[i], alto);
            gfx.DrawString(titulos[i], fuente, XBrushes.Black, x + RellenoCelda, y + 13);
            x += Columnas[i];
        }
        return y + alto;
    }

    private static double DibujarParrafo(XGraphics gfx, string texto, XFont fuente, double x, double y, double ancho)
    {
        foreach (var linea in PartirLineas(gfx, texto, fuente, ancho))
        {
            gfx.DrawString(linea, fuente, XBrushes.Black, x, y + 11);
            y += 14;
        }
        return y;
    }

    private static List<string> PartirLineas(XGraphics gfx, string texto, XFont fuente, double ancho)
    {
        var lineas = new List<string>();
        var actual = string.Empty;
        foreach (var palabra in (texto ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            var candidata = actual.Length == 0 ? palabra : actual + " " + palabra;
            if (gfx.MeasureString(candidata, fuente).Width <= ancho)
            {
                actual = candidata;
            }
            else
            {
                if (actual.Length > 0) lineas.Add(actual);
                actual = palabra;
            }
        }
        if (actual.Length > 0 || lineas.Count == 0) lineas.Add(actual);
        return lineas;
    }

    private static string NombreMes(int mes) =>
        CultureInfo.GetCultureInfo("es-GT").DateTimeFormat.GetMonthName(mes).ToLowerInvariant();

    /// <summary>
    /// PdfSharpCore no trae fuentes: hay que darle una. Se toma la primera que exista de una lista
    /// de rutas conocidas (Liberation Sans en el contenedor, Arial en Windows para desarrollo).
    /// </summary>
    private sealed class FuenteResolver : IFontResolver
    {
        public const string Familia = "CartaSans";
        private static bool _registrado;

        private static readonly (string Regular, string Bold)[] Candidatas =
        {
            ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
            (@"C:\Windows\Fonts\arial.ttf", @"C:\Windows\Fonts\arialbd.ttf"),
        };

        private readonly string _regular;
        private readonly string _bold;

        private FuenteResolver((string Regular, string Bold) rutas) => (_regular, _bold) = rutas;

        public static void Registrar()
        {
            if (_registrado) return;
            var rutas = Candidatas.FirstOrDefault(c => File.Exists(c.Regular) && File.Exists(c.Bold));
            if (rutas.Regular is null)
            {
                throw new InvalidOperationException("No se encontró ninguna fuente TrueType para dibujar la carta de entrega.");
            }
            GlobalFontSettings.FontResolver = new FuenteResolver(rutas);
            _registrado = true;
        }

        public string DefaultFontName => Familia;

        public FontResolverInfo ResolveTypeface(string familyName, bool isBold, bool isItalic) =>
            new(isBold ? "bold" : "regular");

        public byte[] GetFont(string faceName) => File.ReadAllBytes(faceName == "bold" ? _bold : _regular);
    }
}
