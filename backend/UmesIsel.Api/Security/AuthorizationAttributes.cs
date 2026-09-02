using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace UmesIsel.Api.Security;

/// <summary>
/// Base de los atributos de autorización del proyecto.
///
/// Distingue 401 de 403 a propósito, porque el frontend actúa distinto con cada
/// uno: 401 significa "no hay sesión o caducó" y manda a la pantalla de acceso;
/// 403 significa "hay sesión pero esto no es tuyo" y se queda donde está con un
/// mensaje. Devolver siempre 401 haría que a un alumno curioso se le cerrara la
/// sesión en vez de decirle que no.
/// </summary>
public abstract class SessionAuthorizeAttribute : Attribute, IAuthorizationFilter
{
    public virtual void OnAuthorization(AuthorizationFilterContext context)
    {
        // La regla más específica gana. Un controlador se marca entero con
        // [RequireAdmin] para que todo lo que se añada mañana nazca protegido —
        // fallar cerrado por defecto—, y las pocas acciones que además puede usar
        // su dueño llevan su propio atributo. Sin esta cesión, la regla del
        // controlador se evaluaría primero y cortaría al alumno antes de que la
        // de la acción llegara a mirar nada.
        //
        // La comparación es POR TIPO y no por instancia. Con ReferenceEquals no
        // funcionaba —y el fallo era silencioso y del peor tipo: dejaba pasar—
        // porque GetCustomAttributes construye objetos nuevos en cada llamada,
        // así que ni siquiera el atributo de la propia acción se reconocía a sí
        // mismo y todos acababan cediendo el turno a nadie.
        if (CedeAnteLaAccion(context))
        {
            return;
        }

        var user = context.HttpContext.RequestServices.GetRequiredService<CurrentUser>();

        if (!user.IsAuthenticated)
        {
            context.Result = new ObjectResult("Tu sesión no es válida o ya caducó. Vuelve a entrar.")
            {
                StatusCode = StatusCodes.Status401Unauthorized,
            };
            return;
        }

        if (!IsAllowed(user, context))
        {
            context.Result = new ObjectResult("No tienes permiso para ver o modificar esto.")
            {
                StatusCode = StatusCodes.Status403Forbidden,
            };
        }
    }

    protected abstract bool IsAllowed(CurrentUser user, AuthorizationFilterContext context);

    /// <summary>
    /// ¿Soy la regla del CONTROLADOR mientras la acción declara la suya? Entonces
    /// me aparto. Si mi tipo está entre los declarados en la acción, soy yo la
    /// específica y me toca decidir.
    /// </summary>
    private bool CedeAnteLaAccion(AuthorizationFilterContext context)
    {
        if (context.ActionDescriptor is not Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor descriptor)
        {
            return false;
        }

        var tiposEnLaAccion = descriptor.MethodInfo
            .GetCustomAttributes(typeof(SessionAuthorizeAttribute), inherit: true)
            .Select(a => a.GetType())
            .ToList();

        return tiposEnLaAccion.Count > 0 && !tiposEnLaAccion.Contains(GetType());
    }
}

/// <summary>Solo cuentas de administrador activas.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireAdminAttribute : SessionAuthorizeAttribute
{
    protected override bool IsAllowed(CurrentUser user, AuthorizationFilterContext context) => user.IsAdmin;
}

/// <summary>Cualquier sesión válida (admin, alumno o aspirante). Para lo que es común a todos.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireSessionAttribute : SessionAuthorizeAttribute
{
    protected override bool IsAllowed(CurrentUser user, AuthorizationFilterContext context) => true;
}

/// <summary>
/// Abre una acción concreta dentro de un controlador que por lo demás está
/// cerrado. Son las puertas de entrada: sin ellas nadie podría llegar a
/// autenticarse nunca.
///
/// Existe como atributo propio, y no como "quitar el atributo del controlador",
/// porque así la decisión de dejar algo público queda ESCRITA en la acción y se
/// ve al leerla. Una acción pública por omisión es un descuido; una marcada
/// así es una decisión.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public sealed class AllowAnonymousAccessAttribute : SessionAuthorizeAttribute
{
    protected override bool IsAllowed(CurrentUser user, AuthorizationFilterContext context) => true;

    /// <summary>No comprueba nada — ni siquiera que haya sesión, que es justo el punto.</summary>
    public override void OnAuthorization(AuthorizationFilterContext context) { }
}

/// <summary>
/// El dueño del recurso, o un administrador.
///
/// Lee el id del propio recurso desde la ruta —el nombre del parámetro se pasa
/// en <see cref="RouteParam"/>— y lo compara con el sujeto de la sesión. Es la
/// defensa contra IDOR: sin esto, cambiar el número de la URL enseña el
/// expediente del de al lado.
///
/// Cuando el id de la ruta no es el del sujeto (por ejemplo, la ruta lleva el id
/// de una ficha y hay que mirar de qué alumno es), este atributo no sirve y la
/// comprobación se hace dentro de la acción con <see cref="CurrentUser.IsAdminOr"/>,
/// que es lo mismo pero con la consulta que haga falta.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireOwnerOrAdminAttribute : SessionAuthorizeAttribute
{
    public RequireOwnerOrAdminAttribute(SessionRole role, string routeParam)
    {
        Role = role;
        RouteParam = routeParam;
    }

    public SessionRole Role { get; }
    public string RouteParam { get; }

    protected override bool IsAllowed(CurrentUser user, AuthorizationFilterContext context)
    {
        if (user.IsAdmin) return true;

        var raw = context.RouteData.Values[RouteParam]?.ToString();
        // Si la ruta no trae el parámetro que este atributo dice vigilar, es un
        // error de programación. Se niega el paso: fallar cerrado, no abierto.
        if (!int.TryParse(raw, out var id)) return false;

        return user.Role == Role && user.SubjectId == id;
    }
}
