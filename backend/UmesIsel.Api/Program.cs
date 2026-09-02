using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Security;
using UmesIsel.Api.Services;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Tamaño máximo de cualquier cuerpo de petición: 12 MB. Los endpoints de subida
// ya tienen su propio límite de 10 MB, pero este es el techo del servidor para
// TODO lo demás — sin él, un POST de 2 GB a cualquier endpoint se traga la
// memoria del proceso antes de que ningún código nuestro llegue a mirarlo.
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 12L * 1024 * 1024;
});
builder.WebHost.ConfigureKestrel(o =>
{
    o.Limits.MaxRequestBodySize = 12L * 1024 * 1024;
    // Kestrel anuncia "Server: Kestrel" en cada respuesta. Es información
    // gratuita para quien busca exploits de una versión concreta, y hay que
    // apagarla AQUÍ: la cabecera la escribe el servidor después de que corra
    // cualquier middleware, así que intentar borrarla más arriba no funciona.
    o.AddServerHeader = false;
});

// Límites de peticiones — ver Security/RateLimitPolicies.cs.
builder.Services.AddRateLimiter(RateLimitPolicies.Configure);

// Detrás de un proxy inverso (Nginx, IIS con ARR, Cloudflare) la IP de la
// conexión es la del proxy. Sin esto, el límite por IP metería a todo el mundo
// en la misma cubeta y la bitácora registraría siempre la misma dirección.
// Se activa solo si se declara explícitamente en la configuración: confiar en
// X-Forwarded-For sin un proxy delante permitiría a cualquiera falsear su IP.
if (builder.Configuration.GetValue("Hosting:BehindReverseProxy", false))
{
    builder.Services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        o.KnownNetworks.Clear();
        o.KnownProxies.Clear();
    });
}

// La cadena de conexión trae "Data Source=isel.db", una ruta RELATIVA. En
// desarrollo eso resuelve contra la carpeta del proyecto y no se nota; en un
// servidor (IIS, un servicio de Windows, Docker) el directorio de trabajo casi
// nunca es el de la aplicación, y SQLite no protesta: crea una base nueva y
// vacía donde le toque. El síntoma en producción es "se borraron todos los
// alumnos" cuando en realidad se está leyendo otro archivo. Anclarla al
// ContentRoot lo hace imposible. Una ruta absoluta en la configuración
// (p. ej. un disco persistente) se respeta tal cual.
//
// "Default Timeout" es lo que evita el otro fallo clásico de SQLite: si dos
// personas guardan su ficha en el mismo instante, la segunda escritura no
// revienta con "database is locked", espera su turno hasta 30 s.
var connectionString = ResolveSqlitePath(
    builder.Configuration.GetConnectionString("IselDb") ?? "Data Source=isel.db",
    builder.Environment.ContentRootPath);

builder.Services.AddDbContext<IselDbContext>(options => options.UseSqlite(connectionString));

static string ResolveSqlitePath(string connectionString, string contentRoot)
{
    var csb = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(connectionString);
    if (!string.IsNullOrWhiteSpace(csb.DataSource)
        && !csb.DataSource.Equals(":memory:", StringComparison.OrdinalIgnoreCase)
        && !Path.IsPathRooted(csb.DataSource))
    {
        csb.DataSource = Path.GetFullPath(Path.Combine(contentRoot, csb.DataSource));
    }
    csb.DefaultTimeout = 30;
    return csb.ToString();
}

// Fills a copy of the official ficha .xlsx template per student — see Services/FichaXlsxBuilder.cs.
builder.Services.AddSingleton<FichaXlsxBuilder>();
// Converts that filled .xlsx to a ready-to-print PDF via LibreOffice headless — see Services/FichaPdfBuilder.cs.
builder.Services.AddSingleton<FichaPdfBuilder>();

// Módulo de Inscripción (aspirantes de nuevo ingreso) — ver Services/InscripcionPdfBuilder.cs.
builder.Services.AddSingleton<PreinscripcionDocxBuilder>();
builder.Services.AddSingleton<CartaCompromisoDocxBuilder>();
builder.Services.AddSingleton<InscripcionPdfBuilder>();
// Solicitud de impresión de título — ver Services/SolicitudTituloDocxBuilder.cs.
builder.Services.AddSingleton<SolicitudTituloDocxBuilder>();
// Pénsum editable desde el panel de admin — ver Services/PensumService.cs. Scoped: usa el DbContext.
builder.Services.AddScoped<PensumService>();
// Documentos en PDF subidos por aspirantes/alumnos — ver Services/DocumentStorageService.cs.
builder.Services.AddSingleton<DocumentStorageService>();

// ---------------------------------------------------------------- seguridad
builder.Services.AddHttpContextAccessor();

// La clave con la que se firman los tokens de sesión: de la configuración en
// producción, o de un archivo generado fuera de git — ver SigningKeyProvider.
var signingKey = SigningKeyProvider.Resolve(
    builder.Configuration,
    builder.Environment.ContentRootPath,
    LoggerFactory.Create(b => b.AddConsole()).CreateLogger("Security"));

// Caducidades. La de admin es más corta a propósito: es la sesión que puede
// borrar la base y la que más se queda abierta en una máquina compartida.
builder.Services.AddSingleton(new SessionTokenService(
    signingKey,
    adminLifetime: TimeSpan.FromHours(builder.Configuration.GetValue("Security:AdminSessionHours", 8)),
    publicLifetime: TimeSpan.FromHours(builder.Configuration.GetValue("Security:PublicSessionHours", 12))));

// Quién llama, resuelto por petición desde el token — ver SessionAuthenticationMiddleware.
builder.Services.AddScoped<CurrentUser>();
// Bitácora de seguridad — ver Services/AuditService.cs.
builder.Services.AddScoped<AuditService>();

// Respaldos automáticos de la base — ver Services/BackupService.cs.
builder.Services.AddScoped<BackupService>();
builder.Services.AddHostedService<BackupHostedService>();

// Orígenes permitidos. Los dos de desarrollo (Vite) van siempre; el del sitio
// ya publicado se añade por configuración —"Cors:Origins" en appsettings, o la
// variable de entorno Cors__Origins__0— para no tener que recompilar el backend
// el día que se saque a producción. Si se olvida, el síntoma es que el sitio
// carga pero ningún formulario guarda: el navegador bloquea las llamadas.
var allowedOrigins = new[] { "http://localhost:5173", "http://127.0.0.1:5173" }
    .Concat(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? Array.Empty<string>())
    .Distinct()
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              // So the frontend can read the real filename off the ficha download responses.
              .WithExposedHeaders("Content-Disposition");
    });
});

var app = builder.Build();

// Apply pending migrations and (on an empty DB) import the student roster
// seed — see Data/DbInitializer.cs and Data/Seed/README.md.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IselDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    // WAL: los lectores dejan de bloquearse con el que está escribiendo. Sin
    // esto, en el modo por defecto de SQLite, un alumno guardando su ficha
    // congela a todos los demás mientras dura la escritura — y en época de
    // asignación son decenas a la vez. Es un ajuste que se graba en el propio
    // archivo, así que basta con dejarlo puesto una vez, pero se aplica en cada
    // arranque para que una base recién creada en el servidor no dependa de lo
    // que traiga por defecto el driver.
    db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
    db.Database.ExecuteSqlRaw("PRAGMA synchronous=NORMAL;");

    db.Database.Migrate();
    DbInitializer.SeedIfEmpty(db, app.Environment.ContentRootPath, logger);
    DbInitializer.SeedPensum(db, logger);
    // El roster de sacerdotes llegó después que el resto: va en su propio archivo
    // y se importa aunque la base ya tenga alumnos — ver SeedRosterDeCarrera.
    DbInitializer.SeedRosterDeCarrera(
        db, app.Environment.ContentRootPath, "sacerdotes.seed.json",
        "Actualización profesional de la licenciatura en Teología con especialidad en Pastoral", logger);
    // Sin al menos una cuenta de admin, el panel sería inalcanzable — ver SeedAdminUser.
    DbInitializer.SeedAdminUser(db, app.Configuration, logger);
}

// Fire-and-forget: converts the blank template once so LibreOffice's shared profile is already
// warm by the time an admin actually clicks "Imprimir" — a cold conversion takes ~8-9s, a warm one
// ~2-3s. Never blocks startup, and a failure here (e.g. LibreOffice not installed) is only logged.
_ = Task.Run(() => app.Services.GetRequiredService<FichaPdfBuilder>().WarmUp());

// ------------------------------------------------------------- tubería HTTP
// El orden importa y no es intercambiable:
//  1. Cabeceras reenviadas — para que todo lo demás vea la IP y el esquema reales.
//  2. Manejo de errores — el más externo, para atrapar hasta lo que fallen los otros.
//  3. Cabeceras de seguridad — deben salir también en las respuestas de error.
//  4. HSTS/HTTPS, CORS, límite de peticiones y, al final, la identidad.
if (app.Configuration.GetValue("Hosting:BehindReverseProxy", false))
{
    app.UseForwardedHeaders();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

// Swagger documenta y permite invocar TODA la API desde el navegador. En
// desarrollo es cómodo; publicado es un mapa de la aplicación servido en
// bandeja, así que solo existe fuera de producción.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// La redirección a HTTPS se activa solo si hay un puerto HTTPS configurado. En
// desarrollo sobre HTTP puro, dejarla puesta produce un aviso en cada arranque y
// redirecciones a un puerto que no existe.
if (!app.Environment.IsDevelopment() || app.Configuration["ASPNETCORE_HTTPS_PORTS"] is { Length: > 0 })
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCorsPolicy);
app.UseRateLimiter();

// Resuelve quién llama a partir del token. Va DESPUÉS del límite de peticiones
// para que una ráfaga de tokens inválidos no obligue a consultar la base en cada
// intento, y ANTES de los controladores, que es donde se decide el permiso.
app.UseMiddleware<SessionAuthenticationMiddleware>();

app.MapControllers();

app.Run();
