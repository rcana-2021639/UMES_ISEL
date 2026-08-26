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
    }
}
