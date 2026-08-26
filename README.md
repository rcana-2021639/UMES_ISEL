# UMES ISEL — Sitio del Instituto Salesiano de Educación en Línea

Clon rediseñado y exclusivo del apartado **ISEL** de la Universidad Mesoamericana
(https://www.umes.edu.gt/isel-umes). No incluye ninguna otra sección de la
universidad (Inicio, Nosotros, Facultades, Admisión general, etc.) — este sitio
es 100% independiente y dedicado a ISEL.

## Fase actual

**Fase 1 — Página principal de ISEL**: Hero, Programas (6 maestrías + página de
"Información" de cada una con Pensum / Entrevista / Inscripción), Metodología,
Objetivos, Dirección académica y CTA de admisión.

**Fase 2 — Portal y base de datos**: base de datos SQLite (con los alumnos
reales importados desde el Excel del trimestre), login por carné, portal del
alumno (ficha de asignación de cursos con firma digital), panel de admin
(CRUD de alumnos, impresión de asignaciones por día/semana/mes, reporte por
carrera y trimestre). Ver la sección **Portal ISEL** más abajo.

## Stack

- **Backend**: ASP.NET Core Web API (.NET 8) + Entity Framework Core (SQLite) — `backend/UmesIsel.Api`
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion — `frontend/`

## Estructura

```
UMES_PAGISEL/
├── backend/UmesIsel.Api/
│   ├── Controllers/             # Programs, Auth, Students, CourseAssignments
│   ├── Models/
│   │   ├── Entities/             # Student, CourseAssignment (EF Core)
│   │   └── Dtos/                 # formas que expone la API
│   ├── Data/
│   │   ├── IselSeedData.cs       # contenido de las 6 maestrías (marketing)
│   │   ├── IselDbContext.cs      # DbContext (SQLite)
│   │   ├── DbInitializer.cs      # importa Data/Seed/students.seed.json una sola vez
│   │   └── Seed/                 # roster real de alumnos (desde "HOJA 1" del Excel)
│   └── Migrations/               # migraciones de EF Core
└── frontend/
    ├── public/images/          # <- AQUÍ VAN TUS FOTOS (ver READMEs por carpeta)
    │   ├── hero/
    │   ├── programs/
    │   ├── methodology/
    │   ├── advisor/
    │   └── admission/
    └── src/
        ├── components/
        │   ├── layout/         # Navbar, Footer (solo ISEL)
        │   ├── sections/       # Hero, Programas, Metodología, Objetivos...
        │   ├── portal/         # SignaturePad, CourseAssignmentForm, PrintableFicha...
        │   └── ui/             # botones, cards, reveal-on-scroll, tilt 3D, Modal...
        ├── pages/
        │   ├── HomePage.tsx / ProgramDetailPage.tsx  ("Información")
        │   └── portal/          # LoginPage, StudentPortalPage, AdminPortalPage
        ├── data/                # copia local de los programas (fallback)
        ├── hooks/useTilt.ts     # tilt 3D con el cursor (sin "aura")
        └── lib/                 # api.ts (programas), auth.ts, studentsApi.ts, assignmentsApi.ts
```

## Cómo correrlo

Requisitos: **Node.js LTS**, **pnpm** y **.NET 8 SDK** instalados.

### Backend
```bash
cd backend/UmesIsel.Api
dotnet restore
dotnet run
```
Corre en `http://localhost:5199` (Swagger en `/swagger` durante desarrollo).
La primera vez que corre, crea `isel.db` (SQLite, ignorado por git), aplica
las migraciones y — solo si la tabla `Students` está vacía — importa el
roster real desde `Data/Seed/students.seed.json` (144 alumnos, ver el
`README.md` de esa carpeta). Las corridas siguientes no vuelven a importar.

Si cambias algún `Model/Entities/*`, genera una migración nueva:
```bash
dotnet tool install --global dotnet-ef   # una sola vez
dotnet-ef migrations add NombreDelCambio -o Migrations
```
(se aplica sola la próxima vez que corras `dotnet run`).

### Frontend
```bash
cd frontend
pnpm install
pnpm run dev
```
Corre en `http://localhost:5173`. Si el backend no está corriendo, el sitio
sigue funcionando igual: usa automáticamente los datos locales de
`src/data/programs.ts` como respaldo.

## Subir tus imágenes

Cada carpeta en `frontend/public/images/*` tiene un `README.md` con el nombre
exacto de archivo esperado. Mientras el archivo no exista, esa zona se ve como
un recuadro punteado con el nombre esperado (nunca como una imagen "rota").
Solo copia el archivo con ese nombre exacto — no hay que tocar código.

## Enlaces placeholder (reemplazar cuando los tengas)

- **Entrevista de admisión**: actualmente apunta al formulario original de
  Bitrix24. Cámbialo en `backend/UmesIsel.Api/Data/IselSeedData.cs` y en
  `frontend/src/data/programs.ts` (constante `INTERVIEW_URL`).
- **Pensum (PDF)** de cada maestría: actualmente apunta a los PDF ya
  publicados en umes.edu.gt. Reemplázalos por tus propios archivos cuando
  los tengas, en los mismos dos archivos (`pensumUrl` / `PensumUrl`).
- **Inscripción**: ya está habilitado — lleva al Portal ISEL (`/portal/login`,
  ver abajo). El flujo de pago/inscripción en sí sigue pendiente; por ahora el
  botón conecta con el login y la ficha de asignación de cursos.

## Portal ISEL (alumno y administrador)

Un solo campo de texto decide a dónde va el usuario — no hay contraseña:

- **Carné de un alumno real** (de `Data/Seed/students.seed.json`, p. ej.
  `202630503`) → entra a su ficha de asignación de cursos.
- **El código de administrador** (`AdminAccess:Code` en
  `backend/UmesIsel.Api/appsettings.json`, por defecto `ADMINISEL2026`) →
  entra al panel administrativo. Cámbialo ahí cuando quieras.

### Alumno (`/portal/estudiante`)
Ve sus datos (de la base de datos, no editables), completa "Cursos por
asignarse" (hasta 10) y "Cursos adicionales o cambio de sección" (hasta 5),
marca las dos observaciones Sí/No, firma en el recuadro de **Firma digital**
(mouse, lápiz óptico o el dedo — se guarda como imagen) y da clic en
**Guardar asignación**. Vuelve a entrar con el mismo carné para ver/editar lo
guardado.

### Administrador (`/portal/admin`)
- **Impresión de asignaciones**: por fecha exacta (como antes, "Cargar día")
  o con los atajos **HOY / SEMANA / MES**. "Imprimir" (una fila) o
  "Imprimir todas" abre el diálogo de impresión del navegador con una ficha
  por alumno, en el mismo formato que el PDF original.
- **Enviadas por carrera y trimestre**: elige carrera + trimestre y ve quién
  ya envió su ficha ("Enviada") y quién no ("Pendiente").
- **Alumnos**: tabla filtrable por carné, con **Agregar alumno** (pide todos
  los campos del Excel — carné, nombres, carrera, sección, trimestre,
  correos, celular) para no tener que tocar la base de datos a mano, más
  Editar/Eliminar y "Ver ficha" (abre/edita la ficha de ese alumno).

## Notas de diseño

- Sin degradados: toda la paleta usa colores sólidos (`tailwind.config.js` →
  `theme.colors.isel`).
- Animaciones: reveal-on-scroll en toda la página, tilt 3D por cursor en
  tarjetas (no es un "aura" global, solo la tarjeta bajo el cursor reacciona),
  navbar que se transforma al hacer scroll, botones con micro-interacciones.
