using Microsoft.EntityFrameworkCore;
using UmesIsel.Api.Data;

namespace UmesIsel.Api.Security;

/// <summary>
/// Lee <c>Authorization: Bearer &lt;token&gt;</c> y rellena <see cref="CurrentUser"/>.
///
/// No rechaza nada: solo dice quién es. Quien decide si puede pasar son los
/// atributos de autorización de cada endpoint. Separarlo así evita el fallo
/// clásico de "el middleware protege /api/*" y que luego una ruta nueva se
/// escape por no encajar en el patrón: aquí, un endpoint sin atributo no queda
/// protegido por accidente, queda expuesto de forma evidente y la revisión lo ve.
///
/// El rol NO se cree del token: se vuelve a leer de la base en cada petición
/// (que la cuenta de admin siga activa, que el alumno siga existiendo). Así,
/// desactivar o borrar a alguien surte efecto al instante en lugar de esperar a
/// que caduque su token.
/// </summary>
public class SessionAuthenticationMiddleware
{
    private readonly RequestDelegate _next;

    public SessionAuthenticationMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, SessionTokenService tokens, CurrentUser currentUser, IselDbContext db)
    {
        var header = context.Request.Headers.Authorization.ToString();
        if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var payload = tokens.Validate(header["Bearer ".Length..].Trim());
            var role = SessionTokenService.ParseRole(payload?.Role);

            if (payload is not null && role is not null && await StillValidAsync(db, role.Value, payload.SubjectId))
            {
                currentUser.Set(role.Value, payload.SubjectId, payload.Display);
            }
        }

        await _next(context);
    }

    private static async Task<bool> StillValidAsync(IselDbContext db, SessionRole role, int subjectId) => role switch
    {
        SessionRole.Admin => await db.AdminUsers.AsNoTracking().AnyAsync(a => a.Id == subjectId && a.Activo),
        SessionRole.Student => await db.Students.AsNoTracking().AnyAsync(s => s.Id == subjectId),
        // Un aspirante ya migrado a alumno deja de poder tocar su expediente:
        // a partir de ahí el expediente es un registro histórico de Secretaría.
        SessionRole.Applicant => await db.Applicants.AsNoTracking().AnyAsync(a => a.Id == subjectId && a.MigradoStudentId == null),
        _ => false,
    };
}
