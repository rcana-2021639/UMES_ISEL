namespace UmesIsel.Api.Models.Dtos;

/// <summary>
/// The public portal has a single text field. What the visitor types decides
/// what happens next: their carné logs them in as a student; the configured
/// admin access code (see appsettings "AdminAccess:Code") sends them to the
/// admin panel instead. There is no password — see README for the tradeoffs.
/// </summary>
public record LoginRequest(string Value);

public record LoginResponse(string Role, StudentDto? Student);
