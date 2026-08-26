using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UmesIsel.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Students",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Carnet = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    PrimerApellido = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    SegundoApellido = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    PrimerNombre = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    SegundoNombre = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    NombreCompleto = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    Carrera = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Seccion = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    Trimestre = table.Column<int>(type: "INTEGER", nullable: true),
                    CorreoInstitucional = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    CorreoPersonal = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Celular = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Students", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CourseAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StudentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Fecha = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Trimestre = table.Column<int>(type: "INTEGER", nullable: false),
                    Carrera = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    TienePendientesTrimestres = table.Column<bool>(type: "INTEGER", nullable: false),
                    TienePendientesMaterias = table.Column<bool>(type: "INTEGER", nullable: false),
                    CorreoContacto = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    TelefonoContacto = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    ComprobantePagoNo = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    FirmaBase64 = table.Column<string>(type: "TEXT", nullable: true),
                    FirmadoEn = table.Column<DateTime>(type: "TEXT", nullable: true),
                    AutorizadoPorCodigo = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseAssignments_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AdditionalCourseRows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CourseAssignmentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Numero = table.Column<int>(type: "INTEGER", nullable: false),
                    CursoAdicional = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Carrera = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    SemTri = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    Seccion = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    Jornada = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdditionalCourseRows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AdditionalCourseRows_CourseAssignments_CourseAssignmentId",
                        column: x => x.CourseAssignmentId,
                        principalTable: "CourseAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AssignedCourseRows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CourseAssignmentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Numero = table.Column<int>(type: "INTEGER", nullable: false),
                    Curso = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    SemTri = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    Seccion = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssignedCourseRows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssignedCourseRows_CourseAssignments_CourseAssignmentId",
                        column: x => x.CourseAssignmentId,
                        principalTable: "CourseAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AdditionalCourseRows_CourseAssignmentId",
                table: "AdditionalCourseRows",
                column: "CourseAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_AssignedCourseRows_CourseAssignmentId",
                table: "AssignedCourseRows",
                column: "CourseAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseAssignments_StudentId",
                table: "CourseAssignments",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_Students_Carnet",
                table: "Students",
                column: "Carnet",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdditionalCourseRows");

            migrationBuilder.DropTable(
                name: "AssignedCourseRows");

            migrationBuilder.DropTable(
                name: "CourseAssignments");

            migrationBuilder.DropTable(
                name: "Students");
        }
    }
}
