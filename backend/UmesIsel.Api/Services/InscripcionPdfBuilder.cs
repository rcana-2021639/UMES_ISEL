using UmesIsel.Api.Models.Dtos;

namespace UmesIsel.Api.Services;

/// <summary>
/// Arma los PDFs del módulo de Inscripción: cada una de las 3 fichas por separado, o las que existan
/// combinadas en un solo PDF (una hoja por ficha, en orden) — lo que usa el botón "Imprimir" del panel
/// de admin. La conversión a PDF y el merge de páginas se delegan a <see cref="FichaPdfBuilder"/>
/// (mismo perfil de LibreOffice ya calentado, ver <c>ConvertToPdf</c>/<c>MergePdfs</c>) para no
/// levantar un segundo proceso de LibreOffice en paralelo con el que ya usa la ficha de asignación.
///
/// Preinscripción y Carta de compromiso son los FORMATO .docx reales que dio el usuario (retrato,
/// una hoja, diseño intacto — ver <see cref="DocxCellSurgery"/>); la "ficha de asignación" de un
/// aspirante es literalmente la misma plantilla oficial de Excel (Resources/FichaTemplate.xlsx, en
/// horizontal) que ya llena <see cref="FichaXlsxBuilder"/> para un alumno — aquí solo se le da forma
/// de <see cref="CourseAssignmentDto"/> con el carné en blanco (el aspirante todavía no tiene) y los
/// datos que tecleó a mano.
/// </summary>
public class InscripcionPdfBuilder
{
    private readonly PreinscripcionDocxBuilder _preinscripcionBuilder;
    private readonly CartaCompromisoDocxBuilder _compromisoBuilder;
    private readonly FichaXlsxBuilder _asignacionXlsxBuilder;
    private readonly FichaPdfBuilder _pdfConverter;

    public InscripcionPdfBuilder(
        PreinscripcionDocxBuilder preinscripcionBuilder,
        CartaCompromisoDocxBuilder compromisoBuilder,
        FichaXlsxBuilder asignacionXlsxBuilder,
        FichaPdfBuilder pdfConverter)
    {
        _preinscripcionBuilder = preinscripcionBuilder;
        _compromisoBuilder = compromisoBuilder;
        _asignacionXlsxBuilder = asignacionXlsxBuilder;
        _pdfConverter = pdfConverter;
    }

    public byte[] BuildPreinscripcion(PreinscripcionDto p) =>
        _pdfConverter.ConvertToPdf(_preinscripcionBuilder.Build(p), "ficha.docx");

    public byte[] BuildAsignacion(AsignacionNuevoIngresoDto a, string? nombreCompletoAspirante) =>
        _pdfConverter.ConvertXlsxToPdf(_asignacionXlsxBuilder.Build(ToCourseAssignmentDto(a, nombreCompletoAspirante)));

    public byte[] BuildCompromiso(CartaCompromisoDto c, IReadOnlySet<string> documentosSubidos) =>
        _pdfConverter.ConvertToPdf(_compromisoBuilder.Build(c, documentosSubidos), "ficha.docx");

    /// <summary>Las fichas que ese aspirante ya tenga guardadas, combinadas en orden (preinscripción → asignación → compromiso).</summary>
    public byte[] BuildCombinado(ApplicantDto applicant)
    {
        var pdfs = new List<byte[]>();
        if (applicant.Preinscripcion is not null) pdfs.Add(BuildPreinscripcion(applicant.Preinscripcion));
        if (applicant.Asignacion is not null) pdfs.Add(BuildAsignacion(applicant.Asignacion, applicant.NombreCompleto));
        if (applicant.Compromiso is not null)
        {
            var subidos = applicant.Documentos.Select(d => d.Tipo).ToHashSet();
            pdfs.Add(BuildCompromiso(applicant.Compromiso, subidos));
        }
        if (pdfs.Count == 0)
        {
            throw new InvalidOperationException("Este aspirante todavía no tiene ninguna ficha guardada.");
        }
        return pdfs.Count == 1 ? pdfs[0] : FichaPdfBuilder.MergePdfs(pdfs);
    }

    /// <summary>"Imprimir todas" del panel de admin — un aspirante tras otro, cada uno con sus fichas combinadas.</summary>
    public byte[] BuildBatchCombinado(IReadOnlyList<ApplicantDto> applicants)
    {
        var pdfs = applicants.Select(BuildCombinado).ToList();
        return pdfs.Count == 1 ? pdfs[0] : FichaPdfBuilder.MergePdfs(pdfs);
    }

    private static CourseAssignmentDto ToCourseAssignmentDto(AsignacionNuevoIngresoDto a, string? nombreCompletoAspirante) =>
        new(
            Id: 0,
            StudentId: 0,
            Carnet: string.Empty, // el aspirante todavía no tiene carné — la celda queda en blanco
            NombreCompleto: nombreCompletoAspirante ?? string.Empty,
            PrimerApellido: a.PrimerApellido,
            SegundoApellido: a.SegundoApellido,
            PrimerNombre: a.PrimerNombre,
            SegundoNombre: a.SegundoNombre,
            Fecha: a.Fecha,
            Trimestre: a.Trimestre,
            Carrera: a.Carrera,
            Seccion: a.Seccion,
            CursosAsignados: a.CursosAsignados,
            CursosAdicionales: a.CursosAdicionales,
            TienePendientesTrimestres: a.TienePendientesTrimestres,
            TienePendientesMaterias: a.TienePendientesMaterias,
            CorreoContacto: a.CorreoContacto,
            TelefonoContacto: a.TelefonoContacto,
            TipoPago: a.TipoPago,
            FirmaBase64: a.FirmaBase64,
            FirmadoEn: a.FirmadoEn,
            AutorizadoPorCodigo: null,
            UpdatedAt: DateTime.UtcNow
        );
}
