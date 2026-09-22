namespace UmesIsel.Api.Models.Dtos;

/// <summary>Un curso del pénsum, tal como se edita en la pestaña "Pénsum".</summary>
public record PensumCursoDto(int Id, int Trimestre, string Nombre);

/// <summary>Un trimestre con sus cursos, en el orden en que se cursan.</summary>
public record PensumTrimestreDto(int Trimestre, IReadOnlyList<PensumCursoDto> Cursos);

/// <summary>
/// Cuántos expedientes vivos apuntan a esta carrera. Es lo que decide si se
/// puede borrar (0) o solo archivar (&gt; 0), y lo que se le enseña al admin
/// antes de dejarle tocar nada.
/// </summary>
public record PensumUsoDto(int Alumnos, int Fichas, int Aspirantes, int Total);

/// <summary>
/// Una versión del pénsum de una carrera: los cursos vigentes a partir de una cohorte.
/// <see cref="CohorteId"/> null = la versión original, vigente desde siempre.
/// <see cref="Alumnos"/> = cuántos alumnos del padrón reciben esta versión por su cohorte.
/// </summary>
public record PensumVersionDto(
    int? CohorteId,
    string Nombre,
    IReadOnlyList<PensumTrimestreDto> Trimestres,
    int TotalCursos,
    int Alumnos
);

public record PensumCarreraDto(
    int Id,
    string Nombre,
    string Tipo,
    bool EsPrograma,
    bool Activa,
    int Orden,
    /// <summary>La versión vigente para quien se inscribe hoy (la más reciente).</summary>
    IReadOnlyList<PensumTrimestreDto> Trimestres,
    int TotalCursos,
    PensumUsoDto Uso,
    /// <summary>Todas las versiones, de la más antigua a la más reciente.</summary>
    IReadOnlyList<PensumVersionDto> Versiones
);

/// <summary>Alta y edición de una carrera. En edición, cambiar el nombre lo propaga a todos los expedientes.</summary>
public record CarreraUpsertRequest(string Nombre, string? Tipo, bool EsPrograma, bool Activa);

/// <summary>Alta/edición de un curso. <see cref="CohorteId"/> = versión del pénsum en la que va (null = la original); en edición se ignora.</summary>
public record CursoUpsertRequest(int Trimestre, string Nombre, int? CohorteId = null);

/// <summary>Nueva versión del pénsum a partir de una cohorte: arranca como copia de la versión que esa cohorte tenía hasta ahora.</summary>
public record NuevaVersionRequest(int CohorteId);

/// <summary>Una cohorte, tal como la ven los formularios públicos.</summary>
public record CohorteDto(int Id, int Anio, int Periodo, string Nombre, DateOnly? FechaInicio, bool AbiertaInscripcion);

/// <summary>Una cohorte con su uso, para la administración: decide si se puede borrar.</summary>
public record CohorteAdminDto(
    int Id, int Anio, int Periodo, string Nombre, DateOnly? FechaInicio, bool AbiertaInscripcion,
    int Alumnos, int Aspirantes, int VersionesPensum);

public record CohorteUpsertRequest(int Anio, int Periodo, string? Nombre, DateOnly? FechaInicio, bool AbiertaInscripcion);

/// <summary>Nuevo orden de las carreras, de arriba abajo (ids).</summary>
public record ReordenarCarrerasRequest(IReadOnlyList<int> Ids);

/// <summary>
/// La forma ligera que consumen los selectores de carrera de los tres trámites
/// (no lleva el pénsum entero, solo lo que hace falta para pintar la lista).
/// </summary>
public record CarreraOpcionDto(int Id, string Nombre, string Tipo, bool EsPrograma, int Orden);
