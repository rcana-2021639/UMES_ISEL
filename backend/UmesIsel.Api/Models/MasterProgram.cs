namespace UmesIsel.Api.Models;

/// <summary>
/// A single line item inside the "Costos" block of a program's study plan
/// (e.g. "Inscripción Trimestral" -> "Q. 400.00").
/// </summary>
public record CostItem(string Label, string Value);

/// <summary>
/// The "Plan de estudios" block shown on every program detail page.
/// </summary>
public record StudyPlan(
    string Duracion,
    string Modalidad,
    string Tutorias,
    IReadOnlyList<CostItem> Costos,
    string NotaCostos
);

/// <summary>
/// One ISEL master's program ("Maestría"), including both the summary
/// shown on the Programas card grid and the full detail ("Información") page.
/// </summary>
public record MasterProgram(
    string Slug,
    string Title,
    string Tagline,
    string CardImage,
    string? DetailImage,
    IReadOnlyList<string> Paragraphs,
    string PensumUrl,
    StudyPlan Plan
);
