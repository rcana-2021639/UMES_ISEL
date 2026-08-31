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

    public DbSet<Applicant> Applicants => Set<Applicant>();
    public DbSet<Preinscripcion> Preinscripciones => Set<Preinscripcion>();
    public DbSet<AsignacionNuevoIngreso> AsignacionesNuevoIngreso => Set<AsignacionNuevoIngreso>();
    public DbSet<AsignacionNuevoIngresoCursoRow> AsignacionNuevoIngresoCursoRows => Set<AsignacionNuevoIngresoCursoRow>();
    public DbSet<AsignacionNuevoIngresoAdicionalRow> AsignacionNuevoIngresoAdicionalRows => Set<AsignacionNuevoIngresoAdicionalRow>();
    public DbSet<CartaCompromiso> CartasCompromiso => Set<CartaCompromiso>();
    public DbSet<ApplicantDocument> ApplicantDocuments => Set<ApplicantDocument>();
    public DbSet<StudentDocument> StudentDocuments => Set<StudentDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Student>(e =>
        {
            e.HasIndex(s => s.Carnet).IsUnique();
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
    }
}
