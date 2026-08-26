namespace UmesIsel.Api.Models.Dtos;

public record CourseDto(int Id, string Carrera, string Nombre);

public record CourseUpsertRequest(string Carrera, string Nombre);
