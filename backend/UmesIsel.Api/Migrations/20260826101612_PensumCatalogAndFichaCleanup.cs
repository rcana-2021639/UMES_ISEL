using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UmesIsel.Api.Migrations
{
    /// <inheritdoc />
    public partial class PensumCatalogAndFichaCleanup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ComprobantePagoNo",
                table: "CourseAssignments");

            migrationBuilder.AddColumn<int>(
                name: "Trimestre",
                table: "Courses",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Seccion",
                table: "CourseAssignments",
                type: "TEXT",
                maxLength: 10,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Trimestre",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "Seccion",
                table: "CourseAssignments");

            migrationBuilder.AddColumn<string>(
                name: "ComprobantePagoNo",
                table: "CourseAssignments",
                type: "TEXT",
                maxLength: 50,
                nullable: true);
        }
    }
}
