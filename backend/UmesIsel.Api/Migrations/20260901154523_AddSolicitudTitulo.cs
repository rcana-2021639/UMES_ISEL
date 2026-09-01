using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UmesIsel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSolicitudTitulo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SolicitudesTitulo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StudentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Carnet = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Campus = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    FechaSolicitud = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    ParticipaCeremonia = table.Column<bool>(type: "INTEGER", nullable: false),
                    Nombres = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Apellidos = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    FechaNacimiento = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    EstadoCivil = table.Column<string>(type: "TEXT", maxLength: 40, nullable: true),
                    Sexo = table.Column<string>(type: "TEXT", maxLength: 1, nullable: true),
                    DireccionDomicilio = table.Column<string>(type: "TEXT", maxLength: 250, nullable: true),
                    TelefonoDomicilio = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    TelefonoCelular = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    TelefonoEmergencia = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    CorreoElectronico = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Empresa = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Cargo = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    DireccionTrabajo = table.Column<string>(type: "TEXT", maxLength: 250, nullable: true),
                    TelefonoTrabajo = table.Column<string>(type: "TEXT", maxLength: 60, nullable: true),
                    FacultadDepartamento = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    TituloObtener = table.Column<string>(type: "TEXT", maxLength: 250, nullable: true),
                    FotoBase64 = table.Column<string>(type: "TEXT", nullable: true),
                    FirmaBase64 = table.Column<string>(type: "TEXT", nullable: true),
                    FirmadoEn = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Entregada = table.Column<bool>(type: "INTEGER", nullable: false),
                    EntregadaEn = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SolicitudesTitulo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SolicitudesTitulo_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudesTitulo_Carnet",
                table: "SolicitudesTitulo",
                column: "Carnet");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudesTitulo_StudentId",
                table: "SolicitudesTitulo",
                column: "StudentId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SolicitudesTitulo");
        }
    }
}
