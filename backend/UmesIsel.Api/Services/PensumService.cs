using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Models.Dtos;
using UmesIsel.Api.Models.Entities;

namespace UmesIsel.Api.Services;

/// <summary>Lo que salió mal, en palabras que el admin pueda leer.</summary>
public sealed record PensumError(int Status, string Message);

/// <summary>
/// Toda la escritura del pénsum pasa por aquí — es el único sitio del backend
/// que puede crear, renombrar o borrar una carrera o un curso.
///
/// El punto delicado es el nombre de la carrera: no hay clave foránea, el nombre
/// ES la clave con la que consultan los tres trámites (Students.Carrera,
/// CourseAssignments.Carrera, Preinscripciones.Carrera...). Renombrar sin
/// arrastrar esas copias dejaría a los alumnos apuntando a una carrera que ya no
/// existe y su pénsum saldría vacío. Por eso <see cref="ActualizarCarreraAsync"/>
/// hace el arrastre completo dentro de una transacción: o se renombra en todas
/// partes, o no se renombra en ninguna.
/// </summary>
public class PensumService
{
    private readonly IselDbContext _db;

    public PensumService(IselDbContext db) => _db = db;

    private static string Norm(string? s) => (s ?? string.Empty).Trim();

    // ---------------------------------------------------------------- lectura

    /// <summary>El pénsum completo: carreras en su orden, cada una con sus trimestres, cursos y uso.</summary>
    public async Task<IReadOnlyList<PensumCarreraDto>> GetPensumAsync()
    {
        var carreras = await _db.Carreras.AsNoTracking()
            .OrderBy(c => c.Orden).ThenBy(c => c.Nombre)
            .ToListAsync();

        var cursos = await _db.Courses.AsNoTracking()
            .OrderBy(c => c.Trimestre).ThenBy(c => c.Id)
            .ToListAsync();

        var porCarrera = cursos
            .GroupBy(c => c.Carrera, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

        // Los cuatro conteos de uso en cuatro consultas agrupadas, no una por
        // carrera: con veinte carreras eso serían ochenta viajes a la base.
        var alumnos = await CountByCarreraAsync(_db.Students.Select(s => s.Carrera));
        var fichas = await CountByCarreraAsync(_db.CourseAssignments.Select(a => a.Carrera));
        var preins = await CountByCarreraAsync(_db.Preinscripciones.Select(p => p.Carrera));
        var asigNuevo = await CountByCarreraAsync(_db.AsignacionesNuevoIngreso.Select(a => a.Carrera));

        return carreras.Select(c =>
        {
            var propios = porCarrera.GetValueOrDefault(c.Nombre) ?? new List<Course>();
            var trimestres = propios
                .GroupBy(x => x.Trimestre)
                .OrderBy(g => g.Key)
                .Select(g => new PensumTrimestreDto(
                    g.Key,
                    g.Select(x => new PensumCursoDto(x.Id, x.Trimestre, x.Nombre)).ToList()))
                .ToList();

            var nAlumnos = alumnos.GetValueOrDefault(c.Nombre);
            var nFichas = fichas.GetValueOrDefault(c.Nombre);
            var nAspirantes = preins.GetValueOrDefault(c.Nombre) + asigNuevo.GetValueOrDefault(c.Nombre);

            return new PensumCarreraDto(
                c.Id, c.Nombre, c.Tipo, c.EsPrograma, c.Activa, c.Orden,
                trimestres, propios.Count,
                new PensumUsoDto(nAlumnos, nFichas, nAspirantes, nAlumnos + nFichas + nAspirantes));
        }).ToList();
    }

    private static async Task<Dictionary<string, int>> CountByCarreraAsync(IQueryable<string> source)
    {
        var rows = await source
            .GroupBy(nombre => nombre)
            .Select(g => new { Nombre = g.Key, Count = g.Count() })
            .ToListAsync();
        return rows.ToDictionary(r => r.Nombre, r => r.Count, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Las carreras para los selectores: solo las activas, en su orden.
    /// <paramref name="soloProgramas"/> deja fuera los grupos de cursos sueltos
    /// (Inglés), en los que nadie se inscribe.
    /// </summary>
    public async Task<IReadOnlyList<CarreraOpcionDto>> GetOpcionesAsync(bool soloProgramas)
    {
        var query = _db.Carreras.AsNoTracking().Where(c => c.Activa);
        if (soloProgramas)
        {
            query = query.Where(c => c.EsPrograma);
        }
        return await query
            .OrderBy(c => c.Orden).ThenBy(c => c.Nombre)
            .Select(c => new CarreraOpcionDto(c.Id, c.Nombre, c.Tipo, c.EsPrograma, c.Orden))
            .ToListAsync();
    }

    // -------------------------------------------------------------- carreras

    public async Task<(Carrera? Carrera, PensumError? Error)> CrearCarreraAsync(CarreraUpsertRequest request)
    {
        var nombre = Norm(request.Nombre);
        var error = ValidarNombre(nombre);
        if (error is not null) return (null, error);

        if (await ExisteNombreAsync(nombre, exceptoId: null))
        {
            return (null, new PensumError(409, $"Ya existe una carrera con el nombre «{nombre}»."));
        }

        var maxOrden = await _db.Carreras.AnyAsync() ? await _db.Carreras.MaxAsync(c => c.Orden) : 0;
        var now = DateTime.UtcNow;
        var carrera = new Carrera
        {
            Nombre = nombre,
            Tipo = Norm(request.Tipo).Length > 0 ? Norm(request.Tipo) : "Maestría",
            EsPrograma = request.EsPrograma,
            Activa = request.Activa,
            Orden = maxOrden + 1,
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.Carreras.Add(carrera);
        await _db.SaveChangesAsync();
        return (carrera, null);
    }

    public async Task<(Carrera? Carrera, PensumError? Error)> ActualizarCarreraAsync(int id, CarreraUpsertRequest request)
    {
        var carrera = await _db.Carreras.FirstOrDefaultAsync(c => c.Id == id);
        if (carrera is null)
        {
            return (null, new PensumError(404, "Esa carrera ya no existe."));
        }

        var nombre = Norm(request.Nombre);
        var error = ValidarNombre(nombre);
        if (error is not null) return (null, error);

        if (await ExisteNombreAsync(nombre, exceptoId: id))
        {
            return (null, new PensumError(409, $"Ya existe otra carrera con el nombre «{nombre}»."));
        }

        var anterior = carrera.Nombre;
        var renombra = !string.Equals(anterior, nombre, StringComparison.Ordinal);

        // El renombrado toca ocho tablas: o entran todas o no entra ninguna.
        await using var tx = await _db.Database.BeginTransactionAsync();

        carrera.Nombre = nombre;
        carrera.Tipo = Norm(request.Tipo).Length > 0 ? Norm(request.Tipo) : carrera.Tipo;
        carrera.EsPrograma = request.EsPrograma;
        carrera.Activa = request.Activa;
        carrera.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        if (renombra)
        {
            await PropagarRenombradoAsync(anterior, nombre);
        }

        await tx.CommitAsync();
        return (carrera, null);
    }

    /// <summary>
    /// Arrastra el nombre nuevo a todo lo que guardaba el viejo. Son copias
    /// denormalizadas del mismo dato, no historial: si se quedan atrás, el
    /// alumno deja de ver su propio pénsum. Los NOMBRES DE CURSO dentro de una
    /// ficha ya firmada sí se dejan intactos — eso sí es historial, y la ficha
    /// tiene que seguir diciendo lo que decía el día que se imprimió.
    /// </summary>
    private async Task PropagarRenombradoAsync(string anterior, string nuevo)
    {
        await _db.Courses.Where(c => c.Carrera == anterior)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.Carrera, nuevo));
        await _db.Students.Where(s => s.Carrera == anterior)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Carrera, nuevo));
        await _db.CourseAssignments.Where(a => a.Carrera == anterior)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Carrera, nuevo));
        await _db.AdditionalCourseRows.Where(r => r.Carrera == anterior)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Carrera, nuevo));
        await _db.Preinscripciones.Where(p => p.Carrera == anterior)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Carrera, nuevo));
        await _db.AsignacionesNuevoIngreso.Where(a => a.Carrera == anterior)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Carrera, nuevo));
        await _db.AsignacionNuevoIngresoAdicionalRows.Where(r => r.Carrera == anterior)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Carrera, nuevo));
        await _db.CartasCompromiso.Where(c => c.Carrera == anterior)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Carrera, nuevo));
    }

    /// <summary>
    /// Borra la carrera y su pénsum. Se niega si algún expediente vivo la usa:
    /// borrarla dejaría alumnos apuntando a una carrera inexistente. En ese caso
    /// la salida es archivarla (Activa = false), que la saca de los formularios
    /// sin romper el historial.
    /// </summary>
    public async Task<PensumError?> EliminarCarreraAsync(int id)
    {
        var carrera = await _db.Carreras.FirstOrDefaultAsync(c => c.Id == id);
        if (carrera is null)
        {
            return new PensumError(404, "Esa carrera ya no existe.");
        }

        var nombre = carrera.Nombre;
        var alumnos = await _db.Students.CountAsync(s => s.Carrera == nombre);
        var fichas = await _db.CourseAssignments.CountAsync(a => a.Carrera == nombre);
        var aspirantes = await _db.Preinscripciones.CountAsync(p => p.Carrera == nombre)
                       + await _db.AsignacionesNuevoIngreso.CountAsync(a => a.Carrera == nombre);

        if (alumnos + fichas + aspirantes > 0)
        {
            var partes = new List<string>();
            if (alumnos > 0) partes.Add($"{alumnos} alumno{(alumnos == 1 ? "" : "s")}");
            if (fichas > 0) partes.Add($"{fichas} ficha{(fichas == 1 ? "" : "s")} de asignación");
            if (aspirantes > 0) partes.Add($"{aspirantes} expediente{(aspirantes == 1 ? "" : "s")} de inscripción");
            return new PensumError(409,
                $"No se puede eliminar «{nombre}»: la usan {string.Join(", ", partes)}. " +
                "Archívala para que deje de aparecer en los formularios sin perder ese historial.");
        }

        await using var tx = await _db.Database.BeginTransactionAsync();
        await _db.Courses.Where(c => c.Carrera == nombre).ExecuteDeleteAsync();
        _db.Carreras.Remove(carrera);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return null;
    }

    public async Task<PensumError?> ReordenarAsync(ReordenarCarrerasRequest request)
    {
        var ids = request.Ids?.ToList() ?? new List<int>();
        if (ids.Count == 0)
        {
            return new PensumError(400, "No se recibió ningún orden.");
        }

        var carreras = await _db.Carreras.Where(c => ids.Contains(c.Id)).ToListAsync();
        var porId = carreras.ToDictionary(c => c.Id);
        var now = DateTime.UtcNow;
        for (var i = 0; i < ids.Count; i++)
        {
            if (!porId.TryGetValue(ids[i], out var carrera)) continue;
            carrera.Orden = i + 1;
            carrera.UpdatedAt = now;
        }
        await _db.SaveChangesAsync();
        return null;
    }

    // ---------------------------------------------------------------- cursos

    public async Task<(Course? Curso, PensumError? Error)> CrearCursoAsync(int carreraId, CursoUpsertRequest request)
    {
        var carrera = await _db.Carreras.AsNoTracking().FirstOrDefaultAsync(c => c.Id == carreraId);
        if (carrera is null)
        {
            return (null, new PensumError(404, "Esa carrera ya no existe."));
        }

        var error = ValidarCurso(request);
        if (error is not null) return (null, error);

        var nombre = Norm(request.Nombre);
        if (await _db.Courses.AnyAsync(c => c.Carrera == carrera.Nombre && c.Trimestre == request.Trimestre && c.Nombre == nombre))
        {
            return (null, new PensumError(409, $"«{nombre}» ya está en el trimestre {request.Trimestre} de esta carrera."));
        }

        var curso = new Course
        {
            Carrera = carrera.Nombre,
            Trimestre = request.Trimestre,
            Nombre = nombre,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Courses.Add(curso);
        await _db.SaveChangesAsync();
        return (curso, null);
    }

    public async Task<(Course? Curso, PensumError? Error)> ActualizarCursoAsync(int cursoId, CursoUpsertRequest request)
    {
        var curso = await _db.Courses.FirstOrDefaultAsync(c => c.Id == cursoId);
        if (curso is null)
        {
            return (null, new PensumError(404, "Ese curso ya no existe."));
        }

        var error = ValidarCurso(request);
        if (error is not null) return (null, error);

        var nombre = Norm(request.Nombre);
        var duplicado = await _db.Courses.AnyAsync(c =>
            c.Id != cursoId && c.Carrera == curso.Carrera && c.Trimestre == request.Trimestre && c.Nombre == nombre);
        if (duplicado)
        {
            return (null, new PensumError(409, $"«{nombre}» ya está en el trimestre {request.Trimestre} de esta carrera."));
        }

        curso.Trimestre = request.Trimestre;
        curso.Nombre = nombre;
        await _db.SaveChangesAsync();
        return (curso, null);
    }

    public async Task<PensumError?> EliminarCursoAsync(int cursoId)
    {
        var curso = await _db.Courses.FirstOrDefaultAsync(c => c.Id == cursoId);
        if (curso is null)
        {
            return new PensumError(404, "Ese curso ya no existe.");
        }
        _db.Courses.Remove(curso);
        await _db.SaveChangesAsync();
        return null;
    }

    /// <summary>Borra un trimestre entero de una carrera (todos sus cursos de golpe).</summary>
    public async Task<PensumError?> EliminarTrimestreAsync(int carreraId, int trimestre)
    {
        var carrera = await _db.Carreras.AsNoTracking().FirstOrDefaultAsync(c => c.Id == carreraId);
        if (carrera is null)
        {
            return new PensumError(404, "Esa carrera ya no existe.");
        }
        await _db.Courses.Where(c => c.Carrera == carrera.Nombre && c.Trimestre == trimestre).ExecuteDeleteAsync();
        return null;
    }

    private static PensumError? ValidarNombre(string nombre)
    {
        if (nombre.Length == 0)
        {
            return new PensumError(400, "El nombre de la carrera es obligatorio.");
        }
        if (nombre.Length > 200)
        {
            return new PensumError(400, "El nombre de la carrera no puede pasar de 200 caracteres.");
        }
        return null;
    }

    private static PensumError? ValidarCurso(CursoUpsertRequest request)
    {
        if (request.Trimestre < 1 || request.Trimestre > 20)
        {
            return new PensumError(400, "El trimestre tiene que estar entre 1 y 20.");
        }
        var nombre = Norm(request.Nombre);
        if (nombre.Length == 0)
        {
            return new PensumError(400, "El nombre del curso es obligatorio.");
        }
        if (nombre.Length > 200)
        {
            return new PensumError(400, "El nombre del curso no puede pasar de 200 caracteres.");
        }
        return null;
    }

    private Task<bool> ExisteNombreAsync(string nombre, int? exceptoId) =>
        _db.Carreras.AnyAsync(c => c.Nombre.ToLower() == nombre.ToLower() && (exceptoId == null || c.Id != exceptoId));
}
