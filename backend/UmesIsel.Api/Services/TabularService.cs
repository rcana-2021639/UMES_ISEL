using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Xml.Linq;

namespace UmesIsel.Api.Services;

/// <summary>
/// Lectura y escritura de datos tabulares para la exportación y la carga masiva.
///
/// No trae ninguna librería nueva: el .xlsx se lee con <see cref="ZipArchive"/> y
/// XML, que es exactamente la técnica que ya usa <c>FichaXlsxBuilder</c> para
/// rellenar la plantilla oficial. Meter un paquete de terceros solo para esto
/// habría añadido superficie de ataque (y otra dependencia que vigilar por CVEs)
/// a cambio de nada.
/// </summary>
public static class TabularService
{
    // ------------------------------------------------------------------ CSV

    /// <summary>
    /// Escribe un CSV que Excel abre bien en español.
    ///
    /// Dos detalles que parecen manías y no lo son:
    ///  · Va con BOM de UTF-8. Sin él, Excel en Windows abre el archivo como
    ///    ANSI y todas las tildes y eñes salen rotas.
    ///  · El separador es punto y coma, no coma, porque es lo que espera Excel
    ///    en configuración regional española/latinoamericana; con coma, todo
    ///    acaba en una sola columna.
    /// </summary>
    public static byte[] BuildCsv(IEnumerable<string> headers, IEnumerable<IEnumerable<string?>> rows)
    {
        var sb = new StringBuilder();
        sb.Append(string.Join(';', headers.Select(EscapeCsv))).Append("\r\n");
        foreach (var row in rows)
        {
            sb.Append(string.Join(';', row.Select(EscapeCsv))).Append("\r\n");
        }
        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    /// <summary>
    /// Escapa un campo de CSV.
    ///
    /// Además del escapado normal, neutraliza la inyección de fórmulas ("CSV
    /// injection"): un campo que empiece por = + - @ o un tabulador lo interpreta
    /// Excel como fórmula al abrirlo. Como aquí se exportan nombres y correos que
    /// escribió gente de fuera, alguien podría guardar como nombre
    /// <c>=HYPERLINK("http://malo","clic")</c> y esperar a que un administrador
    /// abra el archivo. Anteponer un apóstrofo lo deja como texto.
    /// </summary>
    private static string EscapeCsv(string? value)
    {
        var v = value ?? string.Empty;
        if (v.Length > 0 && (v[0] is '=' or '+' or '-' or '@' or '\t' or '\r'))
        {
            v = "'" + v;
        }
        if (v.Contains(';') || v.Contains('"') || v.Contains('\n') || v.Contains('\r'))
        {
            v = "\"" + v.Replace("\"", "\"\"") + "\"";
        }
        return v;
    }

    /// <summary>Parte un CSV en filas, respetando comillas y saltos de línea dentro de un campo.</summary>
    public static List<List<string>> ParseCsv(string content)
    {
        // El BOM que pone Excel al guardar acabaría pegado a la primera cabecera.
        if (content.Length > 0 && content[0] == '﻿') content = content[1..];

        // Se acepta ; o , como separador: se elige el que más aparezca en la
        // primera línea, que es lo que distingue un CSV guardado por un Excel en
        // español de uno guardado por uno en inglés.
        var primeraLinea = content.Split('\n')[0];
        var sep = primeraLinea.Count(c => c == ';') >= primeraLinea.Count(c => c == ',') ? ';' : ',';

        var filas = new List<List<string>>();
        var fila = new List<string>();
        var campo = new StringBuilder();
        var enComillas = false;

        for (var i = 0; i < content.Length; i++)
        {
            var c = content[i];

            if (enComillas)
            {
                if (c == '"')
                {
                    if (i + 1 < content.Length && content[i + 1] == '"') { campo.Append('"'); i++; }
                    else enComillas = false;
                }
                else campo.Append(c);
                continue;
            }

            if (c == '"') { enComillas = true; }
            else if (c == sep) { fila.Add(campo.ToString()); campo.Clear(); }
            else if (c == '\n')
            {
                fila.Add(campo.ToString().TrimEnd('\r'));
                campo.Clear();
                if (fila.Any(x => x.Trim().Length > 0)) filas.Add(fila);
                fila = new List<string>();
            }
            else campo.Append(c);
        }

        fila.Add(campo.ToString().TrimEnd('\r'));
        if (fila.Any(x => x.Trim().Length > 0)) filas.Add(fila);

        return filas;
    }

    // ----------------------------------------------------------------- XLSX

    /// <summary>
    /// Lee la primera hoja de un .xlsx a filas de texto.
    ///
    /// Un .xlsx es un ZIP con XML dentro. Las celdas de texto no guardan la
    /// cadena: guardan un índice a una tabla común (<c>sharedStrings.xml</c>),
    /// así que hay que leer las dos partes y cruzarlas. Las celdas vacías
    /// sencillamente no aparecen en el XML, y por eso se usa la referencia de
    /// cada celda ("C7") para colocarla en su columna — si no, una celda vacía en
    /// medio correría todo lo demás una posición a la izquierda y el archivo
    /// entero se importaría descuadrado.
    /// </summary>
    public static List<List<string>> ParseXlsx(Stream stream)
    {
        using var zip = new ZipArchive(stream, ZipArchiveMode.Read);

        var shared = new List<string>();
        var sharedEntry = zip.GetEntry("xl/sharedStrings.xml");
        if (sharedEntry is not null)
        {
            using var s = sharedEntry.Open();
            var doc = XDocument.Load(s);
            XNamespace ns = doc.Root!.Name.Namespace;
            foreach (var si in doc.Root.Elements(ns + "si"))
            {
                // El texto de una celda puede venir partido en varios trozos con
                // formatos distintos; se concatenan todos.
                shared.Add(string.Concat(si.Descendants(ns + "t").Select(t => t.Value)));
            }
        }

        var sheetEntry = zip.Entries.FirstOrDefault(e => e.FullName.StartsWith("xl/worksheets/sheet", StringComparison.Ordinal)
                                                      && e.FullName.EndsWith(".xml", StringComparison.Ordinal))
            ?? throw new InvalidOperationException("El archivo no parece un Excel válido: no tiene ninguna hoja.");

        using var sheetStream = sheetEntry.Open();
        var sheet = XDocument.Load(sheetStream);
        XNamespace sns = sheet.Root!.Name.Namespace;

        var filas = new List<List<string>>();
        foreach (var row in sheet.Root.Descendants(sns + "row"))
        {
            var celdas = new List<string>();
            foreach (var c in row.Elements(sns + "c"))
            {
                var indice = ColumnIndex(c.Attribute("r")?.Value);
                while (celdas.Count < indice) celdas.Add(string.Empty);

                var tipo = c.Attribute("t")?.Value;
                var valor = tipo switch
                {
                    // "s" = índice a la tabla de cadenas compartidas.
                    "s" when int.TryParse(c.Element(sns + "v")?.Value, out var idx) && idx < shared.Count => shared[idx],
                    // "inlineStr" = la cadena va escrita dentro de la propia celda.
                    "inlineStr" => string.Concat(c.Descendants(sns + "t").Select(t => t.Value)),
                    _ => c.Element(sns + "v")?.Value ?? string.Empty,
                };
                celdas.Add(valor.Trim());
            }
            if (celdas.Any(x => x.Length > 0)) filas.Add(celdas);
        }
        return filas;
    }

    /// <summary>De la referencia de una celda ("AB12") al índice de su columna, empezando en 0.</summary>
    private static int ColumnIndex(string? reference)
    {
        if (string.IsNullOrEmpty(reference)) return 0;
        var n = 0;
        foreach (var c in reference)
        {
            if (!char.IsLetter(c)) break;
            n = n * 26 + (char.ToUpperInvariant(c) - 'A' + 1);
        }
        return Math.Max(0, n - 1);
    }

    /// <summary>Nombre de archivo seguro para una cabecera Content-Disposition.</summary>
    public static string SafeFileName(string baseName, string extension)
    {
        var limpio = new string(baseName.Where(c => char.IsLetterOrDigit(c) || c is ' ' or '-' or '_').ToArray()).Trim();
        if (limpio.Length == 0) limpio = "export";
        return $"{limpio} {DateTime.Now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}.{extension}";
    }
}
