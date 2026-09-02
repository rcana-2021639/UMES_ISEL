using System.Text.Json;
using UmesIsel.Api.Models.Entities;
using UmesIsel.Api.Security;

namespace UmesIsel.Api.Data;

/// <summary>
/// One-time import of the student roster (from the "HOJA 1" tab of the
/// trimester enrollment spreadsheet, pre-parsed into
/// Data/Seed/students.seed.json — see that folder's README) into the
/// SQLite database. Runs at startup and is a no-op once Students has rows,
/// so it never clobbers data the admin has since edited.
/// </summary>
public static class DbInitializer
{
    private record SeedStudent(
        string Carnet,
        string NombreCompleto,
        string PrimerApellido,
        string? SegundoApellido,
        string PrimerNombre,
        string? SegundoNombre,
        string Carrera,
        string? Seccion,
        int? Trimestre,
        string? CorreoInstitucional,
        string? CorreoPersonal,
        string? Celular
    );

    public static void SeedIfEmpty(IselDbContext db, string contentRootPath, ILogger logger)
    {
        if (db.Students.Any())
        {
            return;
        }

        var seedPath = Path.Combine(contentRootPath, "Data", "Seed", "students.seed.json");
        if (!File.Exists(seedPath))
        {
            logger.LogWarning("No se encontró el archivo de siembra {Path}; la tabla Students quedará vacía.", seedPath);
            return;
        }

        var json = File.ReadAllText(seedPath);
        var seedStudents = JsonSerializer.Deserialize<List<SeedStudent>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        }) ?? new List<SeedStudent>();

        var now = DateTime.UtcNow;
        foreach (var s in seedStudents)
        {
            db.Students.Add(new Student
            {
                Carnet = s.Carnet,
                NombreCompleto = s.NombreCompleto,
                PrimerApellido = s.PrimerApellido,
                SegundoApellido = s.SegundoApellido,
                PrimerNombre = s.PrimerNombre,
                SegundoNombre = s.SegundoNombre,
                Carrera = s.Carrera,
                Seccion = s.Seccion,
                Trimestre = s.Trimestre,
                CorreoInstitucional = s.CorreoInstitucional,
                CorreoPersonal = s.CorreoPersonal,
                Celular = s.Celular,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        db.SaveChanges();
        logger.LogInformation("Se importaron {Count} estudiantes desde {Path}.", seedStudents.Count, seedPath);
    }

    /// <summary>
    /// Importa el roster de una carrera concreta desde su propio archivo de
    /// siembra (hoy: los sacerdotes de la hoja "Sacerdotes" del Excel).
    ///
    /// A diferencia de <see cref="SeedIfEmpty"/>, esto tiene que poder correr
    /// sobre una base que YA tiene alumnos — los sacerdotes llegaron después. La
    /// condición de "ya se importó" es que exista al menos un alumno de esa
    /// carrera: así se importan una sola vez y, si luego el admin da de baja a
    /// alguno, reiniciar el backend no lo resucita.
    /// </summary>
    public static void SeedRosterDeCarrera(IselDbContext db, string contentRootPath, string archivo, string carrera, ILogger logger)
    {
        if (db.Students.Any(s => s.Carrera == carrera))
        {
            return;
        }

        var seedPath = Path.Combine(contentRootPath, "Data", "Seed", archivo);
        if (!File.Exists(seedPath))
        {
            logger.LogWarning("No se encontró el archivo de siembra {Path}; no se importó el roster de {Carrera}.", seedPath, carrera);
            return;
        }

        var seedStudents = JsonSerializer.Deserialize<List<SeedStudent>>(File.ReadAllText(seedPath), new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        }) ?? new List<SeedStudent>();

        // Un carné ya usado por otra carrera se salta en vez de reventar el
        // arranque entero con una violación del índice único.
        var ocupados = db.Students.Select(s => s.Carnet).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var now = DateTime.UtcNow;
        var importados = 0;

        foreach (var s in seedStudents.Where(s => !ocupados.Contains(s.Carnet)))
        {
            db.Students.Add(new Student
            {
                Carnet = s.Carnet,
                NombreCompleto = s.NombreCompleto,
                PrimerApellido = s.PrimerApellido,
                SegundoApellido = s.SegundoApellido,
                PrimerNombre = s.PrimerNombre,
                SegundoNombre = s.SegundoNombre,
                Carrera = s.Carrera,
                Seccion = s.Seccion,
                Trimestre = s.Trimestre,
                CorreoInstitucional = s.CorreoInstitucional,
                CorreoPersonal = s.CorreoPersonal,
                Celular = s.Celular,
                CreatedAt = now,
                UpdatedAt = now,
            });
            ocupados.Add(s.Carnet);
            importados++;
        }

        if (importados == 0)
        {
            return;
        }

        db.SaveChanges();
        logger.LogInformation("Se importaron {Count} alumnos de {Carrera} desde {Path}.", importados, carrera, seedPath);
    }

    /// <summary>
    /// Deja el pénsum en un estado coherente al arrancar, sin pisar nunca lo que
    /// el admin haya editado desde la pestaña "Pénsum":
    ///
    /// 1. Base de datos nueva -> siembra el pénsum oficial completo.
    /// 2. Base de datos ya sembrada -> solo agrega las carreras del archivo de
    ///    siembra que la base todavía no conoce (así entró, por ejemplo, la
    ///    Actualización en Teología sin borrar isel.db). El marcador de "ya la
    ///    conoce" es la fila en <c>Carreras</c>: si el admin borra una carrera a
    ///    propósito, reiniciar no la resucita.
    /// 3. Cualquier carrera que aparezca en <c>Courses</c> sin ficha en
    ///    <c>Carreras</c> (edición a mano de la base, migración vieja) recibe la
    ///    suya, para que nunca haya cursos huérfanos fuera de los selectores.
    /// </summary>
    public static void SeedPensum(IselDbContext db, ILogger logger)
    {
        var registroVacio = !db.Carreras.Any();
        var conocidas = db.Carreras.Select(c => c.Nombre).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var conCursos = db.Courses.Select(c => c.Carrera).Distinct().ToList();
        var conCursosSet = conCursos.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var now = DateTime.UtcNow;
        var cursosAgregados = 0;
        var carrerasAgregadas = 0;

        foreach (var seed in CourseCatalogSeedData.Carreras)
        {
            // Primera vez que la base ve esta carrera: se registra...
            if (conocidas.Contains(seed.Nombre))
            {
                continue;
            }

            db.Carreras.Add(new Carrera
            {
                Nombre = seed.Nombre,
                Tipo = seed.Tipo,
                EsPrograma = seed.EsPrograma,
                Activa = true,
                Orden = seed.Orden,
                CreatedAt = now,
                UpdatedAt = now,
            });
            conocidas.Add(seed.Nombre);
            carrerasAgregadas++;

            // ...y, si además no tiene ni un curso, se le siembra su pénsum. Si ya
            // tenía cursos (base anterior a esta tabla) se respetan tal cual están.
            if (conCursosSet.Contains(seed.Nombre))
            {
                continue;
            }

            var cursos = CourseCatalogSeedData.Courses
                .Where(c => string.Equals(c.Carrera, seed.Nombre, StringComparison.OrdinalIgnoreCase))
                .Select(c => new Course { Carrera = c.Carrera, Trimestre = c.Trimestre, Nombre = c.Nombre, CreatedAt = now })
                .ToList();
            db.Courses.AddRange(cursos);
            cursosAgregados += cursos.Count;
        }

        // Cursos cuya carrera no está en el registro: se les inventa la ficha
        // mínima para que sigan siendo elegibles.
        foreach (var nombre in conCursos.Where(n => !conocidas.Contains(n)))
        {
            db.Carreras.Add(new Carrera
            {
                Nombre = nombre,
                Tipo = "Maestría",
                EsPrograma = true,
                Activa = true,
                Orden = 100,
                CreatedAt = now,
                UpdatedAt = now,
            });
            conocidas.Add(nombre);
            carrerasAgregadas++;
        }

        if (carrerasAgregadas == 0 && cursosAgregados == 0)
        {
            return;
        }

        db.SaveChanges();
        logger.LogInformation(
            registroVacio
                ? "Se sembró el pénsum oficial: {Carreras} carreras y {Cursos} cursos."
                : "Pénsum actualizado: {Carreras} carreras nuevas y {Cursos} cursos nuevos.",
            carrerasAgregadas, cursosAgregados);
    }

    /// <summary>
    /// Garantiza que exista al menos una cuenta de administrador con la que
    /// entrar. Sin esto, el día que se cambia del código compartido a cuentas
    /// nombradas nadie podría abrir el panel.
    ///
    /// Toma el usuario y la contraseña de la configuración
    /// (<c>AdminAccess:BootstrapUser</c> / <c>AdminAccess:BootstrapPassword</c>,
    /// o las variables de entorno <c>AdminAccess__BootstrapUser</c> y
    /// <c>AdminAccess__BootstrapPassword</c>). Si no hay contraseña configurada,
    /// genera una aleatoria y la escribe UNA VEZ en el log de arranque, marcada
    /// para cambiarse en el primer acceso.
    ///
    /// Nunca toca nada si ya hay cuentas: no es forma de recuperar el acceso si
    /// se pierde la contraseña (para eso está el comando documentado en el README).
    /// </summary>
    public static void SeedAdminUser(IselDbContext db, IConfiguration config, ILogger logger)
    {
        if (db.AdminUsers.Any())
        {
            return;
        }

        var username = (config["AdminAccess:BootstrapUser"] ?? "admin").Trim().ToLowerInvariant();
        var password = config["AdminAccess:BootstrapPassword"];
        var generada = string.IsNullOrWhiteSpace(password);

        if (generada)
        {
            password = PasswordHasher.GenerateReadablePassword();
        }

        var now = DateTime.UtcNow;
        db.AdminUsers.Add(new AdminUser
        {
            Username = username,
            NombreCompleto = "Administrador",
            PasswordHash = PasswordHasher.Hash(password!),
            Activo = true,
            // Si la contraseña la generó el sistema (y por tanto quedó escrita en
            // un log), hay que cambiarla al entrar. Si la puso el administrador
            // en la configuración, es suya y ya la eligió.
            DebeCambiarPassword = generada,
            CreatedAt = now,
            UpdatedAt = now,
        });
        db.SaveChanges();

        if (generada)
        {
            logger.LogWarning(
                "\n=================================================================\n" +
                "  CUENTA DE ADMINISTRADOR CREADA\n" +
                "    usuario:    {Usuario}\n" +
                "    contraseña: {Password}\n" +
                "  Anótala AHORA: no vuelve a aparecer. Se te pedirá cambiarla al entrar.\n" +
                "  Para fijarla tú, define AdminAccess__BootstrapPassword antes del primer arranque.\n" +
                "=================================================================",
                username, password);
        }
        else
        {
            logger.LogInformation("Cuenta de administrador «{Usuario}» creada con la contraseña de la configuración.", username);
        }
    }
}
