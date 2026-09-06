# UMES_ISEL — reglas del repositorio

## Git

- **Una sola rama: `main`.** Nada de ramas paralelas ni de trabajo. Todo se
  commitea y se sube a `main`.
- **Ningun commit lleva firma de asistente de IA.** Prohibido `Co-Authored-By:
  Claude ...`, `Generated with [Claude Code]` o cualquier variante, en el
  mensaje o en el autor. El hook `.githooks/commit-msg` las borra solo; la
  regla existe igual aunque el hook falte.
- Mensajes de commit en espanol, en presente, describiendo el efecto para quien
  usa el sistema — no el cambio tecnico.

Tras clonar, activar los hooks una vez:

    git config core.hooksPath .githooks

## Estructura

- `backend/UmesIsel.Api` — API .NET 8 + EF Core sobre SQLite (`isel.db`).
- `frontend` — React 18 + Vite + Tailwind + framer-motion.

## Levantar el proyecto

    dotnet run --project backend/UmesIsel.Api     # http://localhost:5199
    pnpm --dir frontend run dev                   # http://localhost:5173

## Limpiar datos de prueba

Desde `backend/UmesIsel.Api`:

    dotnet run -- limpiar-pruebas

Borra fichas, aspirantes, solicitudes y PDF subidos; NO toca el padron del
Excel, el pensum ni las cuentas del panel. Pide confirmacion y solo corre en
Development. Ver `DESPLIEGUE.md`, seccion 5, para el detalle y para la opcion
nuclear (borrar `isel.db` entero).
