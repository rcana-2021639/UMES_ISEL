using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UmesIsel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCarrerasPensumEditable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Carreras",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Nombre = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Tipo = table.Column<string>(type: "TEXT", maxLength: 60, nullable: false),
                    EsPrograma = table.Column<bool>(type: "INTEGER", nullable: false),
                    Activa = table.Column<bool>(type: "INTEGER", nullable: false),
                    Orden = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Carreras", x => x.Id);
                });

            // El índice de abajo es único, así que una base que ya tuviera el mismo
            // curso dos veces en el mismo trimestre haría fallar la migración entera
            // al arrancar. Se limpian primero los repetidos (se conserva el primero
            // que se dio de alta, que es el que ya referencian las fichas).
            migrationBuilder.Sql(@"
                DELETE FROM Courses
                WHERE Id NOT IN (
                    SELECT MIN(Id) FROM Courses GROUP BY Carrera, Trimestre, Nombre
                );");

            migrationBuilder.CreateIndex(
                name: "IX_Courses_Carrera_Trimestre_Nombre",
                table: "Courses",
                columns: new[] { "Carrera", "Trimestre", "Nombre" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Carreras_Nombre",
                table: "Carreras",
                column: "Nombre",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Carreras");

            migrationBuilder.DropIndex(
                name: "IX_Courses_Carrera_Trimestre_Nombre",
                table: "Courses");
        }
    }
}
