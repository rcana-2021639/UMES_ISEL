using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Models.Entities;

namespace UmesIsel.Api.Data;

public class IselDbContext : DbContext
{
    public IselDbContext(DbContextOptions<IselDbContext> options) : base(options) { }

    public DbSet<Student> Students => Set<Student>();
    public DbSet<CourseAssignment> CourseAssignments => Set<CourseAssignment>();
    public DbSet<AssignedCourseRow> AssignedCourseRows => Set<AssignedCourseRow>();
    public DbSet<AdditionalCourseRow> AdditionalCourseRows => Set<AdditionalCourseRow>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Carrera> Carreras => Set<Carrera>();

    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<SecurityEvent> SecurityEvents => Set<SecurityEvent>();

    public DbSet<Applicant> Applicants => Set<Applicant>();
    public DbSet<Preinscripcion> Preinscripciones => Set<Preinscripcion>();
    public DbSet<AsignacionNuevoIngreso> AsignacionesNuevoIngreso => Set<AsignacionNuevoIngreso>();
    public DbSet<AsignacionNuevoIngresoCursoRow> AsignacionNuevoIngresoCursoRows => Set<AsignacionNuevoIngresoCursoRow>();
    public DbSet<AsignacionNuevoIngresoAdicionalRow> AsignacionNuevoIngresoAdicionalRows => Set<AsignacionNuevoIngresoAdicionalRow>();
    public DbSet<CartaCompromiso> CartasCompromiso => Set<CartaCompromiso>();
    public DbSet<ApplicantDocument> ApplicantDocuments => Set<ApplicantDocument>();
    public DbSet<StudentDocument> StudentDocuments => Set<StudentDocument>();

    public DbSet<SolicitudTitulo> SolicitudesTitulo => Set<SolicitudTitulo>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Student>(e =>
        {
            e.HasIndex(s => s.Carnet).IsUnique();
        });

        // Cuentas del panel. El usuario se guarda ya en minúsculas (ver
        // AuthController), así que un índice único normal basta para que no
        // existan "mrodriguez" y "MRodriguez" como cuentas distintas.
        modelBuilder.Entity<AdminUser>(e =>
        {
            e.HasIndex(a => a.Username).IsUnique();
        });

        // Bitácora de seguridad. Los índices son los de las dos preguntas que se
        // le hacen: "¿qué pasó últimamente?" y "¿qué alertas hay?".
        modelBuilder.Entity<SecurityEvent>(e =>
        {
            e.HasIndex(x => x.OcurridoEn);
            e.HasIndex(x => new { x.EsAlerta, x.OcurridoEn });
        });

        // Registro de carreras del pénsum. El nombre es la clave real con la que
        // el resto de la app consulta (Students.Carrera, Courses.Carrera...), así
        // que no puede haber dos iguales — ver PensumService.
        modelBuilder.Entity<Carrera>(e =>
        {
            e.HasIndex(c => c.Nombre).IsUnique();
        });

        // El pénsum no puede tener el mismo curso dos veces en el mismo trimestre
        // de la misma carrera: sale duplicado en la ficha impresa.
        modelBuilder.Entity<Course>(e =>
        {
            e.HasIndex(c => new { c.Carrera, c.Trimestre, c.Nombre }).IsUnique();
        });

        modelBuilder.Entity<CourseAssignment>(e =>
        {
            e.HasOne(ca => ca.Student)
                .WithMany(s => s.CourseAssignments)
                .HasForeignKey(ca => ca.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AssignedCourseRow>(e =>
        {
            e.HasOne(r => r.CourseAssignment)
                .WithMany(ca => ca.CursosAsignados)
                .HasForeignKey(r => r.CourseAssignmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AdditionalCourseRow>(e =>
        {
            e.HasOne(r => r.CourseAssignment)
                .WithMany(ca => ca.CursosAdicionales)
                .HasForeignKey(r => r.CourseAssignmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- Inscripción (aspirantes de nuevo ingreso) ---------------------------------------
        modelBuilder.Entity<Applicant>(e =>
        {
            e.HasIndex(a => a.Dpi);
            e.HasIndex(a => a.Pasaporte);
            // Sin FK de cascada hacia Student: migrar a un aspirante no debe poder borrar,
            // ni ser borrado por, el alumno resultante.
            e.HasOne(a => a.MigradoStudent)
                .WithMany()
                .HasForeignKey(a => a.MigradoStudentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Preinscripcion>(e =>
        {
            e.HasIndex(p => p.ApplicantId).IsUnique();
            e.HasOne(p => p.Applicant)
                .WithOne(a => a.Preinscripcion)
                .HasForeignKey<Preinscripcion>(p => p.ApplicantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AsignacionNuevoIngreso>(e =>
        {
            e.HasIndex(a => a.ApplicantId).IsUnique();
            e.HasOne(a => a.Applicant)
                .WithOne(ap => ap.AsignacionNuevoIngreso)
                .HasForeignKey<AsignacionNuevoIngreso>(a => a.ApplicantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AsignacionNuevoIngresoCursoRow>(e =>
        {
            e.HasOne(r => r.AsignacionNuevoIngreso)
                .WithMany(a => a.CursosAsignados)
                .HasForeignKey(r => r.AsignacionNuevoIngresoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AsignacionNuevoIngresoAdicionalRow>(e =>
        {
            e.HasOne(r => r.AsignacionNuevoIngreso)
                .WithMany(a => a.CursosAdicionales)
                .HasForeignKey(r => r.AsignacionNuevoIngresoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CartaCompromiso>(e =>
        {
            e.HasIndex(c => c.ApplicantId).IsUnique();
            e.HasOne(c => c.Applicant)
                .WithOne(a => a.CartaCompromiso)
                .HasForeignKey<CartaCompromiso>(c => c.ApplicantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ApplicantDocument>(e =>
        {
            e.HasIndex(d => new { d.ApplicantId, d.Tipo }).IsUnique();
            e.HasOne(d => d.Applicant)
                .WithMany(a => a.Documentos)
                .HasForeignKey(d => d.ApplicantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StudentDocument>(e =>
        {
            e.HasIndex(d => new { d.StudentId, d.Tipo }).IsUnique();
            e.HasOne(d => d.Student)
                .WithMany(s => s.Documentos)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- Solicitud de impresión de título ------------------------------------------------
        modelBuilder.Entity<SolicitudTitulo>(e =>
        {
            // Una solicitud viva por alumno: volver a entrar con el mismo carné la reanuda.
            e.HasIndex(s => s.StudentId).IsUnique();
            e.HasIndex(s => s.Carnet);
            e.HasOne(s => s.Student)
                .WithMany()
                .HasForeignKey(s => s.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
