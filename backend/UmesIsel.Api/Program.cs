using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;
using UmesIsel.Api.Services;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<IselDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("IselDb")));

// Fills a copy of the official ficha .xlsx template per student — see Services/FichaXlsxBuilder.cs.
builder.Services.AddSingleton<FichaXlsxBuilder>();
// Converts that filled .xlsx to a ready-to-print PDF via LibreOffice headless — see Services/FichaPdfBuilder.cs.
builder.Services.AddSingleton<FichaPdfBuilder>();

// Módulo de Inscripción (aspirantes de nuevo ingreso) — ver Services/InscripcionPdfBuilder.cs.
builder.Services.AddSingleton<PreinscripcionDocxBuilder>();
builder.Services.AddSingleton<CartaCompromisoDocxBuilder>();
builder.Services.AddSingleton<InscripcionPdfBuilder>();
// Documentos en PDF subidos por aspirantes/alumnos — ver Services/DocumentStorageService.cs.
builder.Services.AddSingleton<DocumentStorageService>();

// The React dev server (Vite) runs on 5173 by default; add your deployed
// frontend origin here too once it exists.
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
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
    db.Database.Migrate();
    DbInitializer.SeedIfEmpty(db, app.Environment.ContentRootPath, logger);
    DbInitializer.SeedCoursesIfEmpty(db, logger);
}

// Fire-and-forget: converts the blank template once so LibreOffice's shared profile is already
// warm by the time an admin actually clicks "Imprimir" — a cold conversion takes ~8-9s, a warm one
// ~2-3s. Never blocks startup, and a failure here (e.g. LibreOffice not installed) is only logged.
_ = Task.Run(() => app.Services.GetRequiredService<FichaPdfBuilder>().WarmUp());

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors(FrontendCorsPolicy);
app.UseAuthorization();
app.MapControllers();

app.Run();
