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

## Borrar la base de datos y empezar de cero

Ver la seccion "Reiniciar desde cero" en `DESPLIEGUE.md`.
