using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UmesIsel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInscripciones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Applicants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Dpi = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    Pasaporte = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    PrimerApellido = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    SegundoApellido = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    PrimerNombre = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    SegundoNombre = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    NombreCompleto = table.Column<string>(type: "TEXT", maxLength: 250, nullable: true),
                    EsExtranjero = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    MigradoStudentId = table.Column<int>(type: "INTEGER", nullable: true),
                    MigradoEn = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Applicants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Applicants_Students_MigradoStudentId",
                        column: x => x.MigradoStudentId,
                        principalTable: "Students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "StudentDocuments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StudentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Tipo = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    FilePath = table.Column<string>(type: "TEXT", maxLength: 400, nullable: false),
                    FileName = table.Column<string>(type: "TEXT", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    SizeBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudentDocuments_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ApplicantDocuments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ApplicantId = table.Column<int>(type: "INTEGER", nullable: false),
                    Tipo = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    FilePath = table.Column<string>(type: "TEXT", maxLength: 400, nullable: false),
                    FileName = table.Column<string>(type: "TEXT", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    SizeBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicantDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApplicantDocuments_Applicants_ApplicantId",
                        column: x => x.ApplicantId,
                        principalTable: "Applicants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AsignacionesNuevoIngreso",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ApplicantId = table.Column<int>(type: "INTEGER", nullable: false),
                    PrimerApellido = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    SegundoApellido = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    PrimerNombre = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    SegundoNombre = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    Fecha = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Trimestre = table.Column<int>(type: "INTEGER", nullable: false),
                    Carrera = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Seccion = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    TienePendientesTrimestres = table.Column<bool>(type: "INTEGER", nullable: false),
                    TienePendientesMaterias = table.Column<bool>(type: "INTEGER", nullable: false),
                    CorreoContacto = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    TelefonoContacto = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    FirmaBase64 = table.Column<string>(type: "TEXT", nullable: true),
                    FirmadoEn = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AsignacionesNuevoIngreso", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AsignacionesNuevoIngreso_Applicants_ApplicantId",
                        column: x => x.ApplicantId,
                        principalTable: "Applicants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CartasCompromiso",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ApplicantId = table.Column<int>(type: "INTEGER", nullable: false),
                    Fecha = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Carrera = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    EsExtranjero = table.Column<bool>(type: "INTEGER", nullable: false),
                    NombreCompleto = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    NoDpi = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    FirmaBase64 = table.Column<string>(type: "TEXT", nullable: true),
                    FirmadoEn = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CartasCompromiso", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CartasCompromiso_Applicants_ApplicantId",
                        column: x => x.ApplicantId,
                        principalTable: "Applicants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Preinscripciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ApplicantId = table.Column<int>(type: "INTEGER", nullable: false),
                    NombreCompleto = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    Dpi = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    NoPasaporte = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    Carrera = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Jornada = table.Column<string>(type: "TEXT", maxLength: 60, nullable: true),
                    FechaNacimiento = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    Genero = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    LugarNacimiento = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Nacionalidad = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    DireccionCompleta = table.Column<string>(type: "TEXT", maxLength: 250, nullable: true),
                    Departamento = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Municipio = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    EstadoCivil = table.Column<string>(type: "TEXT", maxLength: 40, nullable: true),
                    ComunidadLinguistica = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    PuebloPertenencia = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    IdiomaMaterno = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    CorreoElectronico = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    TelefonoCelular = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    TelefonoCasa = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    Emergencia1Nombre = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Emergencia1Telefono = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    Emergencia2Nombre = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Emergencia2Telefono = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    TieneAlergia = table.Column<bool>(type: "INTEGER", nullable: false),
                    AlergiaDescripcion = table.Column<string>(type: "TEXT", maxLength: 250, nullable: true),
                    TieneProblemaSalud = table.Column<bool>(type: "INTEGER", nullable: false),
                    SaludDescripcion = table.Column<string>(type: "TEXT", maxLength: 250, nullable: true),
                    FirmaBase64 = table.Column<string>(type: "TEXT", nullable: true),
                    FirmadoEn = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Preinscripciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Preinscripciones_Applicants_ApplicantId",
                        column: x => x.ApplicantId,
                        principalTable: "Applicants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AsignacionNuevoIngresoAdicionalRows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AsignacionNuevoIngresoId = table.Column<int>(type: "INTEGER", nullable: false),
                    Numero = table.Column<int>(type: "INTEGER", nullable: false),
                    CursoAdicional = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Carrera = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    SemTri = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    Seccion = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    Jornada = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AsignacionNuevoIngresoAdicionalRows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AsignacionNuevoIngresoAdicionalRows_AsignacionesNuevoIngreso_AsignacionNuevoIngresoId",
                        column: x => x.AsignacionNuevoIngresoId,
                        principalTable: "AsignacionesNuevoIngreso",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AsignacionNuevoIngresoCursoRows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AsignacionNuevoIngresoId = table.Column<int>(type: "INTEGER", nullable: false),
                    Numero = table.Column<int>(type: "INTEGER", nullable: false),
                    Curso = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    SemTri = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    Seccion = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AsignacionNuevoIngresoCursoRows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AsignacionNuevoIngresoCursoRows_AsignacionesNuevoIngreso_AsignacionNuevoIngresoId",
                        column: x => x.AsignacionNuevoIngresoId,
                        principalTable: "AsignacionesNuevoIngreso",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicantDocuments_ApplicantId_Tipo",
                table: "ApplicantDocuments",
                columns: new[] { "ApplicantId", "Tipo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Applicants_Dpi",
                table: "Applicants",
                column: "Dpi");

            migrationBuilder.CreateIndex(
                name: "IX_Applicants_MigradoStudentId",
                table: "Applicants",
                column: "MigradoStudentId");

            migrationBuilder.CreateIndex(
                name: "IX_Applicants_Pasaporte",
                table: "Applicants",
                column: "Pasaporte");

            migrationBuilder.CreateIndex(
                name: "IX_AsignacionNuevoIngresoAdicionalRows_AsignacionNuevoIngresoId",
                table: "AsignacionNuevoIngresoAdicionalRows",
                column: "AsignacionNuevoIngresoId");

            migrationBuilder.CreateIndex(
                name: "IX_AsignacionNuevoIngresoCursoRows_AsignacionNuevoIngresoId",
                table: "AsignacionNuevoIngresoCursoRows",
                column: "AsignacionNuevoIngresoId");

            migrationBuilder.CreateIndex(
                name: "IX_AsignacionesNuevoIngreso_ApplicantId",
                table: "AsignacionesNuevoIngreso",
                column: "ApplicantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CartasCompromiso_ApplicantId",
                table: "CartasCompromiso",
                column: "ApplicantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Preinscripciones_ApplicantId",
                table: "Preinscripciones",
                column: "ApplicantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StudentDocuments_StudentId_Tipo",
                table: "StudentDocuments",
                columns: new[] { "StudentId", "Tipo" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicantDocuments");

            migrationBuilder.DropTable(
                name: "AsignacionNuevoIngresoAdicionalRows");

            migrationBuilder.DropTable(
                name: "AsignacionNuevoIngresoCursoRows");

            migrationBuilder.DropTable(
                name: "CartasCompromiso");

            migrationBuilder.DropTable(
                name: "Preinscripciones");

            migrationBuilder.DropTable(
                name: "StudentDocuments");

            migrationBuilder.DropTable(
                name: "AsignacionesNuevoIngreso");

            migrationBuilder.DropTable(
                name: "Applicants");
        }
    }
}
