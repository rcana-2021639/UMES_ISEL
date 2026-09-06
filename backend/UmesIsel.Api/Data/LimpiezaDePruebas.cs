using Microsoft.EntityFrameworkCore;

namespace UmesIsel.Api.Data;

/// <summary>
/// "Déjame la base como recién instalada, pero SIN tocar el padrón."
///
/// ── Por qué existe ──────────────────────────────────────────────────────────
/// Para volver a probar el circuito completo hay que barrer lo que se generó
/// probando: fichas de asignación, aspirantes a medias, solicitudes de título y
/// los PDF que se subieron. La forma bruta —borrar <c>isel.db</c>— también
/// funciona, pero se lleva por delante el padrón, las cuentas del panel y el
/// pénsum, y luego hay que volver a sembrarlo todo y a averiguar la contraseña
/// del administrador en el log de arranque.
///
/// Esto hace lo contrario: borra SOLO lo que se produce usando el sistema y deja
/// intacto lo que se cargó una vez y no se vuelve a cargar.
///
/// ── Lo que NO toca, nunca ───────────────────────────────────────────────────
///  · <c>Students</c> — el padrón que vino del Excel. Ni uno.
///  · <c>Courses</c> y <c>Carreras</c> — el pénsum, con el orden que fijó el admin.
///  · <c>AdminUsers</c> — las cuentas del panel y sus contraseñas.
///
/// ── La excepción, y por qué ─────────────────────────────────────────────────
/// Sí borra los alumnos que NACIERON de una inscripción de prueba: los que
/// entraron al padrón con el botón "Agregar a BD" de un aspirante. Esos no
/// vienen del Excel —los creó la propia prueba— y dejarlos sería dejar basura
/// dentro de lo único que había que respetar. Se reconocen sin ambigüedad porque
/// su expediente los apunta con <c>Applicants.MigradoStudentId</c>.
///
/// ── Orden de borrado ────────────────────────────────────────────────────────
/// De las hojas hacia la raíz. Aunque las relaciones estén configuradas en
/// cascada, hacerlo explícito es lo que permite CONTAR lo que se borra de cada
/// cosa y enseñarlo; un borrado en cascada silencioso deja al que lo ejecuta sin
/// saber qué pasó.
/// </summary>
public static class LimpiezaDePruebas
{
    public static async Task EjecutarAsync(
        IselDbContext db,
        string contentRootPath,
        bool sinPreguntar,
        ILogger logger)
    {
        Console.WriteLine();
        Console.WriteLine("  LIMPIEZA DE DATOS DE PRUEBA");
        Console.WriteLine("  ---------------------------");

        // Fotografía de lo que hay, ANTES de tocar nada: es lo que se le enseña a
        // quien va a confirmar. Confirmar a ciegas no es confirmar.
        var alumnosMigrados = await db.Applicants
            .Where(a => a.MigradoStudentId != null)
            .Select(a => a.MigradoStudentId!.Value)
            .Distinct()
            .ToListAsync();

        var padron = await db.Students.CountAsync();
        var resumen = new (string Rotulo, int Cuantos)[]
        {
            ("Fichas de asignación", await db.CourseAssignments.CountAsync()),
            ("Aspirantes (inscripción en línea)", await db.Applicants.CountAsync()),
            ("Solicitudes de título", await db.SolicitudesTitulo.CountAsync()),
            ("Papelería subida por alumnos", await db.StudentDocuments.CountAsync()),
            ("Documentos subidos por aspirantes", await db.ApplicantDocuments.CountAsync()),
            ("Sucesos de la bitácora", await db.SecurityEvents.CountAsync()),
            ("Alumnos creados desde una inscripción", alumnosMigrados.Count),
        };

        Console.WriteLine("  Se va a borrar:");
        foreach (var (rotulo, cuantos) in resumen)
        {
            Console.WriteLine($"    {cuantos,6}  {rotulo}");
        }
        Console.WriteLine();
        Console.WriteLine($"  Se conservan intactos: {padron - alumnosMigrados.Count} alumnos del padrón,");
        Console.WriteLine($"                         el pénsum y las cuentas del panel.");
        Console.WriteLine();

        if (resumen.All(r => r.Cuantos == 0))
        {
            Console.WriteLine("  No hay nada que borrar. La base ya está limpia.");
            Console.WriteLine();
            return;
        }

        if (!sinPreguntar)
        {
            Console.Write("  Escriba SI (en mayúsculas) para continuar: ");
            var respuesta = Console.ReadLine();
            if (respuesta?.Trim() != "SI")
            {
                Console.WriteLine("  Cancelado. No se borró nada.");
                Console.WriteLine();
                return;
            }
        }

        // Todo dentro de una transacción: o se va todo o no se va nada. Una
        // limpieza a medias deja fichas apuntando a alumnos que ya no existen,
        // que es un estado peor que el de partida.
        await using var tx = await db.Database.BeginTransactionAsync();

        // -- Inscripción en línea: de la hoja a la raíz --
        await db.AsignacionNuevoIngresoCursoRows.ExecuteDeleteAsync();
        await db.AsignacionNuevoIngresoAdicionalRows.ExecuteDeleteAsync();
        await db.AsignacionesNuevoIngreso.ExecuteDeleteAsync();
        await db.CartasCompromiso.ExecuteDeleteAsync();
        await db.Preinscripciones.ExecuteDeleteAsync();
        await db.ApplicantDocuments.ExecuteDeleteAsync();
        await db.Applicants.ExecuteDeleteAsync();

        // -- Fichas de asignación del portal --
        await db.AssignedCourseRows.ExecuteDeleteAsync();
        await db.AdditionalCourseRows.ExecuteDeleteAsync();
        await db.CourseAssignments.ExecuteDeleteAsync();

        // -- Trámites y papelería colgados del alumno --
        await db.StudentDocuments.ExecuteDeleteAsync();
        await db.SolicitudesTitulo.ExecuteDeleteAsync();

        // -- Los alumnos que creó una inscripción de prueba (ver arriba) --
        if (alumnosMigrados.Count > 0)
        {
            await db.Students.Where(s => alumnosMigrados.Contains(s.Id)).ExecuteDeleteAsync();
        }

        // -- El resto del padrón se queda, pero sin la marca de papelería: esa
        //    respuesta la dio alguien probando, no viene del Excel. --
        await db.Students.ExecuteUpdateAsync(s => s.SetProperty(x => x.PapeleriaEnOrden, false));

        // -- La bitácora. Se va porque son los sucesos de las pruebas; en un
        //    servidor de verdad esto no se ejecuta nunca (ver la guarda de
        //    Program.cs: el comando se niega a correr en producción). --
        await db.SecurityEvents.ExecuteDeleteAsync();

        await tx.CommitAsync();

        // -- Los PDF del disco. Van DESPUÉS de confirmar la transacción: si el
        //    borrado de la base fallara, los archivos seguirían haciendo juego
        //    con lo que la base dice. --
        var uploads = Path.Combine(contentRootPath, "App_Data", "uploads");
        var archivos = 0;
        if (Directory.Exists(uploads))
        {
            archivos = Directory.GetFiles(uploads, "*", SearchOption.AllDirectories).Length;
            try
            {
                Directory.Delete(uploads, recursive: true);
            }
            catch (IOException ex)
            {
                // Un PDF abierto en otra ventana no puede invalidar la limpieza
                // de la base, que es lo que de verdad importaba.
                logger.LogWarning(ex, "No se pudieron borrar todos los PDF de App_Data/uploads.");
                Console.WriteLine("  Aviso: algún PDF no se pudo borrar (¿lo tiene abierto otro programa?).");
            }
        }

        Console.WriteLine();
        Console.WriteLine($"  Listo. Base limpia y {archivos} archivo(s) PDF eliminados.");
        Console.WriteLine("  El padrón, el pénsum y las cuentas del panel siguen como estaban.");
        Console.WriteLine();
    }
}
