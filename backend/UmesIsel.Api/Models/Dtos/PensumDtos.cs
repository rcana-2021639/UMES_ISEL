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

public record PensumCarreraDto(
    int Id,
    string Nombre,
    string Tipo,
    bool EsPrograma,
    bool Activa,
    int Orden,
    IReadOnlyList<PensumTrimestreDto> Trimestres,
    int TotalCursos,
    PensumUsoDto Uso
);

/// <summary>Alta y edición de una carrera. En edición, cambiar el nombre lo propaga a todos los expedientes.</summary>
public record CarreraUpsertRequest(string Nombre, string? Tipo, bool EsPrograma, bool Activa);

public record CursoUpsertRequest(int Trimestre, string Nombre);

/// <summary>Nuevo orden de las carreras, de arriba abajo (ids).</summary>
public record ReordenarCarrerasRequest(IReadOnlyList<int> Ids);

/// <summary>
/// La forma ligera que consumen los selectores de carrera de los tres trámites
/// (no lleva el pénsum entero, solo lo que hace falta para pintar la lista).
/// </summary>
public record CarreraOpcionDto(int Id, string Nombre, string Tipo, bool EsPrograma, int Orden);
