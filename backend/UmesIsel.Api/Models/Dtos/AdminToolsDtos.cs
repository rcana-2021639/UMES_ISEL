namespace UmesIsel.Api.Models.Dtos;

/// <summary>Una fila del resumen por carrera del panel de inicio.</summary>
public record ResumenCarreraDto(string Carrera, int Alumnos, int Fichas, int Aspirantes, int SolicitudesTitulo);

/// <summary>
/// Las cifras de la pantalla de inicio del panel: lo que hay que saber al abrir
/// el día sin tener que entrar en cada pestaña a contar a mano.
/// </summary>
public record ResumenDto(
    int TotalAlumnos,
    int TotalFichas,
    int FichasHoy,
    int FichasEstaSemana,
    int PapeleriaPendiente,
    int AspirantesEnProceso,
    int AspirantesCompletos,
    int SolicitudesTituloPendientes,
    int AlertasSeguridad7Dias,
    DateTime? UltimoRespaldo,
    IReadOnlyList<ResumenCarreraDto> PorCarrera
);

/// <summary>Un problema encontrado en una fila del archivo de carga masiva.</summary>
public record ImportProblemaDto(int Fila, string Carnet, string Motivo);

/// <summary>
/// Resultado de una carga masiva. En modo prueba (<c>dryRun</c>) no se escribe
/// nada y esto es exactamente lo que PASARÍA: es la pantalla de confirmación.
/// </summary>
public record ImportResultDto(
    bool Simulacion,
    int FilasLeidas,
    int NuevosAlumnos,
    int Actualizados,
    int Omitidos,
    IReadOnlyList<ImportProblemaDto> Problemas,
    IReadOnlyList<string> ColumnasDetectadas
);

public record BackupInfoDto(string Nombre, long Bytes, DateTime CreadoEn);
