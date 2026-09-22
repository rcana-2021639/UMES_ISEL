using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UmesIsel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCohortes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Courses_Carrera_Trimestre_Nombre",
                table: "Courses");

            migrationBuilder.AddColumn<int>(
                name: "CohorteId",
                table: "Students",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CohorteId",
                table: "Preinscripciones",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CohorteId",
                table: "Courses",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Cohortes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Anio = table.Column<int>(type: "INTEGER", nullable: false),
                    Periodo = table.Column<int>(type: "INTEGER", nullable: false),
                    Nombre = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    FechaInicio = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    AbiertaInscripcion = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cohortes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Students_CohorteId",
                table: "Students",
                column: "CohorteId");

            migrationBuilder.CreateIndex(
                name: "IX_Preinscripciones_CohorteId",
                table: "Preinscripciones",
                column: "CohorteId");

            migrationBuilder.CreateIndex(
                name: "IX_Courses_Carrera_CohorteId_Trimestre_Nombre",
                table: "Courses",
                columns: new[] { "Carrera", "CohorteId", "Trimestre", "Nombre" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Courses_CohorteId",
                table: "Courses",
                column: "CohorteId");

            migrationBuilder.CreateIndex(
                name: "IX_Cohortes_Anio_Periodo",
                table: "Cohortes",
                columns: new[] { "Anio", "Periodo" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Courses_Cohortes_CohorteId",
                table: "Courses",
                column: "CohorteId",
                principalTable: "Cohortes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Preinscripciones_Cohortes_CohorteId",
                table: "Preinscripciones",
                column: "CohorteId",
                principalTable: "Cohortes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Cohortes_CohorteId",
                table: "Students",
                column: "CohorteId",
                principalTable: "Cohortes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Courses_Cohortes_CohorteId",
                table: "Courses");

            migrationBuilder.DropForeignKey(
                name: "FK_Preinscripciones_Cohortes_CohorteId",
                table: "Preinscripciones");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Cohortes_CohorteId",
                table: "Students");

            migrationBuilder.DropTable(
                name: "Cohortes");

            migrationBuilder.DropIndex(
                name: "IX_Students_CohorteId",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_Preinscripciones_CohorteId",
                table: "Preinscripciones");

            migrationBuilder.DropIndex(
                name: "IX_Courses_Carrera_CohorteId_Trimestre_Nombre",
                table: "Courses");

            migrationBuilder.DropIndex(
                name: "IX_Courses_CohorteId",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "CohorteId",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "CohorteId",
                table: "Preinscripciones");

            migrationBuilder.DropColumn(
                name: "CohorteId",
                table: "Courses");

            migrationBuilder.CreateIndex(
                name: "IX_Courses_Carrera_Trimestre_Nombre",
                table: "Courses",
                columns: new[] { "Carrera", "Trimestre", "Nombre" },
                unique: true);
        }
    }
}
