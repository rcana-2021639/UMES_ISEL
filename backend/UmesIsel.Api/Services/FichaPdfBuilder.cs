using System.Diagnostics;
using PdfSharpCore.Pdf;
using PdfSharpCore.Pdf.IO;
using UmesIsel.Api.Models.Dtos;

namespace UmesIsel.Api.Services;

/// <summary>
/// Turns a filled ficha (see <see cref="FichaXlsxBuilder"/>) into a ready-to-print PDF, so the admin
/// panel's "Imprimir" opens something the browser can print with one click instead of making the
/// admin open Excel first. Conversion is done by shelling out to LibreOffice headless
/// (<c>soffice --headless --convert-to pdf</c>) — the only reliable free way to render an .xlsx to
/// PDF exactly as Excel/LibreOffice itself would lay it out, without a paid rendering library.
/// LibreOffice must be installed on whatever machine runs this (see README "Requisitos").
/// </summary>
public class FichaPdfBuilder
{
    private readonly FichaXlsxBuilder _xlsxBuilder;
    private readonly ILogger<FichaPdfBuilder> _logger;

    private static readonly string[] SofficeCandidatePaths =
    {
        @"C:\Program Files\LibreOffice\program\soffice.exe",
        @"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "/usr/bin/soffice",
        "/usr/bin/libreoffice",
        "/opt/libreoffice/program/soffice",
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    };

    public FichaPdfBuilder(FichaXlsxBuilder xlsxBuilder, ILogger<FichaPdfBuilder> logger)
    {
        _xlsxBuilder = xlsxBuilder;
        _logger = logger;
    }

    /// <summary>One ficha → one PDF.</summary>
    public byte[] BuildOne(CourseAssignmentDto ca) => ConvertXlsxToPdf(_xlsxBuilder.Build(ca));

    /// <summary>
    /// Converts the blank template once, discarding the result, purely to "warm up" the shared
    /// LibreOffice profile before an admin ever clicks Imprimir — a cold conversion (first-run
    /// profile setup) takes ~8-9s, a warm one ~2-3s. Call this fire-and-forget right after startup
    /// (see Program.cs); never let a failure here (e.g. LibreOffice not installed yet) crash startup.
    /// </summary>
    public void WarmUp()
    {
        try
        {
            ConvertXlsxToPdf(_xlsxBuilder.BuildBlankForWarmUp());
            _logger.LogInformation("LibreOffice quedó listo (perfil compartido calentado) para convertir fichas a PDF.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo precalentar LibreOffice al iniciar — la primera ficha impresa tardará más de lo normal.");
        }
    }

    /// <summary>
    /// Several fichas → a single combined PDF (each ficha's page(s) appended in order), so "Imprimir
    /// todas" is one print job instead of a folder of separate files.
    /// </summary>
    public byte[] BuildBatch(IReadOnlyList<CourseAssignmentDto> assignments)
    {
        var pdfs = assignments.Select(ca => ConvertXlsxToPdf(_xlsxBuilder.Build(ca))).ToList();
        return pdfs.Count == 1 ? pdfs[0] : MergePdfs(pdfs);
    }

    // One profile, reused across every conversion (created once, never deleted) instead of a fresh
    // one per call. A brand-new profile makes LibreOffice redo first-run setup (font/config caching)
    // on every single conversion, which was most of the ~8s "Imprimir" was taking; reusing the same
    // profile lets it skip that after the first call. The tradeoff is losing per-call isolation, but
    // this is a low-traffic single-admin tool — a rare clash between two simultaneous conversions is
    // an acceptable cost for routinely-faster prints.
    private static readonly string SharedProfileDir = Path.Combine(Path.GetTempPath(), "isel-libreoffice-profile");

    /// <summary>
    /// internal (no private) a propósito: <see cref="InscripcionPdfBuilder"/> reutiliza esta misma
    /// conversión (perfil de LibreOffice compartido incluido) para las fichas nuevas de Inscripción,
    /// en vez de duplicar el shelling a soffice — ver el comentario de esa clase.
    /// </summary>
    internal byte[] ConvertXlsxToPdf(byte[] xlsxBytes)
    {
        var soffice = FindSoffice();
        var workDir = Path.Combine(Path.GetTempPath(), "isel-ficha-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(workDir);
        Directory.CreateDirectory(SharedProfileDir);
        try
        {
            var xlsxPath = Path.Combine(workDir, "ficha.xlsx");
            File.WriteAllBytes(xlsxPath, xlsxBytes);

            var psi = new ProcessStartInfo
            {
                FileName = soffice,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            psi.ArgumentList.Add("--headless");
            psi.ArgumentList.Add("--norestore");
            psi.ArgumentList.Add("--nologo");
            psi.ArgumentList.Add("--nofirststartwizard");
            psi.ArgumentList.Add("--nolockcheck");
            psi.ArgumentList.Add("--nodefault");
            psi.ArgumentList.Add($"-env:UserInstallation=file:///{SharedProfileDir.Replace('\\', '/')}");
            psi.ArgumentList.Add("--convert-to");
            psi.ArgumentList.Add("pdf");
            psi.ArgumentList.Add("--outdir");
            psi.ArgumentList.Add(workDir);
            psi.ArgumentList.Add(xlsxPath);

            using var process = new Process { StartInfo = psi };
            try
            {
                process.Start();
            }
            catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or InvalidOperationException)
            {
                throw new InvalidOperationException(
                    "No se encontró LibreOffice (soffice) en este servidor — es necesario para convertir la ficha a PDF. " +
                    "Instálalo (winget install TheDocumentFoundation.LibreOffice) y vuelve a intentar.", ex);
            }

            var stderrTask = process.StandardError.ReadToEndAsync();
            var stdoutTask = process.StandardOutput.ReadToEndAsync();
            var exited = process.WaitForExit(60_000);
            if (!exited)
            {
                TryKill(process);
                throw new InvalidOperationException("La conversión a PDF tardó demasiado (LibreOffice no respondió a tiempo).");
            }
            process.WaitForExit(); // ensure the redirected streams are fully flushed

            if (process.ExitCode != 0)
            {
                var stderr = stderrTask.GetAwaiter().GetResult();
                _logger.LogError("soffice --convert-to pdf falló (código {Code}): {Stderr}", process.ExitCode, stderr);
                throw new InvalidOperationException($"LibreOffice no pudo convertir la ficha a PDF (código {process.ExitCode}).");
            }
            _ = stdoutTask.GetAwaiter().GetResult();

            var pdfPath = Path.Combine(workDir, "ficha.pdf");
            if (!File.Exists(pdfPath))
            {
                throw new InvalidOperationException("LibreOffice no generó el archivo PDF esperado.");
            }
            return File.ReadAllBytes(pdfPath);
        }
        finally
        {
            try
            {
                Directory.Delete(workDir, recursive: true);
            }
            catch (IOException)
            {
                // Best-effort cleanup — a lingering temp folder isn't worth failing the request over.
            }
        }
    }

    private static void TryKill(Process process)
    {
        try
        {
            process.Kill(entireProcessTree: true);
        }
        catch (InvalidOperationException)
        {
            // Already exited between the timeout check and here — nothing to kill.
        }
    }

    private static string FindSoffice()
    {
        foreach (var candidate in SofficeCandidatePaths)
        {
            if (File.Exists(candidate)) return candidate;
        }
        // Not found at any known install path — let Process.Start try resolving "soffice" from PATH;
        // if that also fails it throws Win32Exception, which the caller turns into a clear message.
        return "soffice";
    }

    /// <summary>internal por la misma razón que <see cref="ConvertXlsxToPdf"/> — reutilizado por <see cref="InscripcionPdfBuilder"/>.</summary>
    internal static byte[] MergePdfs(IReadOnlyList<byte[]> pdfs)
    {
        using var output = new MemoryStream();
        using var document = new PdfDocument();
        foreach (var pdfBytes in pdfs)
        {
            using var ms = new MemoryStream(pdfBytes);
            using var source = PdfReader.Open(ms, PdfDocumentOpenMode.Import);
            for (var i = 0; i < source.PageCount; i++)
            {
                document.AddPage(source.Pages[i]);
            }
        }
        document.Save(output, closeStream: false);
        return output.ToArray();
    }
}
