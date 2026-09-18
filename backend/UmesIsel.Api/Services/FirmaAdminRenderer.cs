using System.Collections.Concurrent;
using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace UmesIsel.Api.Services;

/// <summary>
/// La firma del administrador que da fe de haber revisado una ficha, con la fecha del día escrita
/// "a mano" al lado — lista para pegarse al pie de la ficha de asignación impresa.
///
/// Sustituye firmar y fechar a bolígrafo cada ficha después de imprimirla, que con decenas al día
/// era la parte más lenta del trámite. La firma es un PNG que dio el propio administrador
/// (Resources/FirmaAdmin.png); la fecha no puede ir en una tipografía de imprenta al lado de una
/// firma de verdad —canta a sello—, así que se dibuja con una letra manuscrita y cada carácter va
/// con su propia inclinación y altura, un poco distintas cada vez, como cuando se escribe rápido.
/// </summary>
public class FirmaAdminRenderer
{
    private readonly string _firmaPath;
    private readonly string _fontPath;
    private readonly Lazy<Image<Rgba32>> _firma;
    private readonly Lazy<FontFamily> _fontFamily;

    // Una composición por fecha: a lo largo de un día se imprimen muchas fichas y la imagen es la
    // misma para todas. Se genera con jitter aleatorio una vez y se reutiliza, así el día entero
    // lleva la misma "mano".
    private readonly ConcurrentDictionary<DateOnly, byte[]> _cache = new();

    public FirmaAdminRenderer(IWebHostEnvironment env)
    {
        _firmaPath = Path.Combine(env.ContentRootPath, "Resources", "FirmaAdmin.png");
        _fontPath = Path.Combine(env.ContentRootPath, "Resources", "Caveat-Regular.ttf");
        _firma = new Lazy<Image<Rgba32>>(CargarFirma);
        _fontFamily = new Lazy<FontFamily>(() => new FontCollection().Add(_fontPath));
        _soloFirma = new Lazy<byte[]>(() =>
        {
            // Sobre blanco, sin canal alfa: PdfSharpCore pinta los PNG con transparencia como un
            // bloque negro, y la carta va sobre papel blanco de todos modos.
            var firma = _firma.Value;
            using var lienzo = new Image<Rgba32>(firma.Width, firma.Height, new Rgba32(255, 255, 255, 255));
            lienzo.Mutate(c => c.DrawImage(firma, new Point(0, 0), 1f));
            using var ms = new MemoryStream();
            lienzo.SaveAsPng(ms);
            return ms.ToArray();
        });
    }

    public bool Disponible => File.Exists(_firmaPath) && File.Exists(_fontPath);

    /// <summary>PNG con fondo transparente: firma a la izquierda, fecha manuscrita a su derecha, abajo.</summary>
    public byte[] Render(DateOnly fecha) => _cache.GetOrAdd(fecha, Componer);

    /// <summary>
    /// Solo la firma, sin fecha: la carta de entrega de fichas la lleva sobre la línea de "quien
    /// entrega", donde una fecha manuscrita al lado no tiene sentido — la carta ya va fechada arriba.
    /// </summary>
    public byte[] RenderSoloFirma() => _soloFirma.Value;

    private readonly Lazy<byte[]> _soloFirma;

    /// <summary>
    /// La firma tal como se entregó viene en vertical (el nombre escrito de arriba abajo); se gira
    /// para que quede horizontal y se recortan los márgenes transparentes, que en el original son
    /// la mayor parte del lienzo y desplazarían la firma a cualquier sitio menos donde se la ancla.
    /// </summary>
    private Image<Rgba32> CargarFirma()
    {
        var img = Image.Load<Rgba32>(_firmaPath);
        img.Mutate(x => x.Rotate(RotateMode.Rotate270));
        DejarSoloLaTinta(img);
        var caja = CajaDeTinta(img);
        img.Mutate(x => x.Crop(caja));
        return img;
    }

    /// <summary>
    /// Deja solo el trazo: todo lo claro pasa a transparente.
    ///
    /// El PNG que se entregó no tiene transparencia de verdad: trae dibujado el damero gris y blanco
    /// que los editores enseñan como "fondo transparente" — una captura de pantalla, en la práctica.
    /// Pegado tal cual, la ficha impresa saldría con un rectángulo cuadriculado detrás de la firma.
    /// Como la tinta es oscura y el damero es claro, basta con un umbral por luminosidad, con una
    /// rampa suave para que los bordes del trazo no queden dentados.
    /// </summary>
    private static void DejarSoloLaTinta(Image<Rgba32> img)
    {
        img.ProcessPixelRows(acceso =>
        {
            for (var y = 0; y < acceso.Height; y++)
            {
                var fila = acceso.GetRowSpan(y);
                for (var x = 0; x < fila.Length; x++)
                {
                    var p = fila[x];
                    var lum = (p.R * 299 + p.G * 587 + p.B * 114) / 1000;
                    // Por debajo de 90 es tinta plena; por encima de 170 es fondo; entre medias, borde.
                    var alfa = lum <= 90 ? 255 : lum >= 170 ? 0 : (170 - lum) * 255 / 80;
                    alfa = alfa * p.A / 255;
                    fila[x] = new Rgba32(0x10, 0x10, 0x10, (byte)alfa);
                }
            }
        });
    }

    private byte[] Componer(DateOnly fecha)
    {
        var firma = _firma.Value;

        // Altura de trabajo fija: la firma se escala a ella y la fecha se dimensiona en proporción,
        // así la composición sale igual sin importar a qué resolución se haya escaneado la firma.
        const int alto = 260;
        var escala = (float)alto / firma.Height;
        var anchoFirma = (int)Math.Round(firma.Width * escala);

        var fuente = _fontFamily.Value.CreateFont(alto * 0.34f, FontStyle.Regular);
        var texto = fecha.ToString("dd/MM/yyyy");

        // La fecha, carácter por carácter, cada uno con su propia pequeña rotación y altura.
        // Semilla derivada de la fecha: el mismo día siempre sale con el mismo trazo (y el caché
        // de arriba lo garantiza de todos modos), pero dos días distintos no son calcados.
        var azar = new Random(fecha.DayNumber * 7919);
        var tinta = new Rgba32(0x1B, 0x2A, 0x4A, 0xFF); // azul tinta de bolígrafo, no negro de impresora

        var separacion = (int)(alto * 0.18f);
        var xTexto = anchoFirma + separacion;
        var anchoLienzo = xTexto + (int)(texto.Length * fuente.Size * 0.62f) + separacion;

        using var firmaEscalada = firma.Clone(c => c.Resize(anchoFirma, alto));
        using var lienzo = new Image<Rgba32>(anchoLienzo, alto);
        lienzo.Mutate(ctx =>
        {
            ctx.DrawImage(firmaEscalada, new Point(0, 0), 1f);

            // La fecha va en la mitad inferior, como quien la apunta debajo del trazo de la firma.
            var x = (float)xTexto;
            var lineaBase = alto * 0.82f;
            foreach (var ch in texto)
            {
                var s = ch.ToString();
                var medida = TextMeasurer.Measure(s, new TextOptions(fuente));
                var giro = (float)(azar.NextDouble() * 10 - 5);       // ±5°
                var subida = (float)(azar.NextDouble() * alto * 0.06); // hasta 6 % de la altura
                var origen = new PointF(x, lineaBase - medida.Height - subida);

                var opciones = new TextOptions(fuente) { Origin = origen };
                ctx.SetDrawingTransform(System.Numerics.Matrix3x2.CreateRotation(
                    giro * (float)Math.PI / 180f, new PointF(origen.X + medida.Width / 2, origen.Y + medida.Height / 2)));
                ctx.DrawText(opciones, s, tinta);
                ctx.SetDrawingTransform(System.Numerics.Matrix3x2.Identity);

                x += medida.Width * 0.92f + (float)(azar.NextDouble() * 2);
            }
        });

        using var ms = new MemoryStream();
        lienzo.SaveAsPng(ms);
        return ms.ToArray();
    }

    /// <summary>Rectángulo mínimo que contiene todos los píxeles no transparentes.</summary>
    private static Rectangle CajaDeTinta(Image<Rgba32> img)
    {
        int minX = img.Width, minY = img.Height, maxX = -1, maxY = -1;
        img.ProcessPixelRows(acceso =>
        {
            for (var y = 0; y < acceso.Height; y++)
            {
                var fila = acceso.GetRowSpan(y);
                for (var x = 0; x < fila.Length; x++)
                {
                    if (fila[x].A < 40) continue;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        });
        if (maxX < 0) return new Rectangle(0, 0, img.Width, img.Height);
        const int margen = 8;
        minX = Math.Max(0, minX - margen);
        minY = Math.Max(0, minY - margen);
        maxX = Math.Min(img.Width - 1, maxX + margen);
        maxY = Math.Min(img.Height - 1, maxY + margen);
        return new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }
}
