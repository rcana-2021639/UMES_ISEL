using Microsoft.AspNetCore.Mvc;

namespace UmesIsel.Api.Security;

/// <summary>
/// Respuesta 403 para las comprobaciones de propiedad que se hacen dentro de una
/// acción (cuando la ruta no trae el id del sujeto y hay que consultarlo antes).
///
/// Existe porque <c>ControllerBase.Forbid()</c> NO sirve aquí: delega en el
/// sistema de autenticación de ASP.NET y, como este proyecto usa tokens propios
/// sin registrar ningún esquema, lanza «No authenticationScheme was specified» y
/// el cliente recibe un 500. Es decir, la comprobación de seguridad funcionaba
/// pero se manifestaba como un error del servidor — lo detectó la prueba de
/// penetración, no el compilador.
/// </summary>
public static class ControllerBaseExtensions
{
    public static ObjectResult NoEsTuyo(this ControllerBase controller) =>
        new("No tienes permiso para ver o modificar esto.")
        {
            StatusCode = StatusCodes.Status403Forbidden,
        };
}
