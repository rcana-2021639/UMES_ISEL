using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UmesIsel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMarcaDeImpresionEnFichas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<System.DateTime>(
                name: "ImpresaEn",
                table: "CourseAssignments",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImpresaPor",
                table: "CourseAssignments",
                type: "TEXT",
                maxLength: 120,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImpresaEn",
                table: "CourseAssignments");

            migrationBuilder.DropColumn(
                name: "ImpresaPor",
                table: "CourseAssignments");
        }
    }
}
