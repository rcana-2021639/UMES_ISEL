using System.Text.Json;
using UmesIsel.Api.Models.Entities;

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
    /// Loads the official pensum (Data/CourseCatalogSeedData.cs) into Courses,
    /// once. Never runs again afterwards, so any future pensum correction
    /// needs a migration/manual update, not a restart.
    /// </summary>
    public static void SeedCoursesIfEmpty(IselDbContext db, ILogger logger)
    {
        if (db.Courses.Any())
        {
            return;
        }

        db.Courses.AddRange(CourseCatalogSeedData.Courses);
        db.SaveChanges();
        logger.LogInformation("Se importaron {Count} cursos del pénsum oficial.", CourseCatalogSeedData.Courses.Count);
    }
}
