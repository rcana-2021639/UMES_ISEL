# UMES ISEL — Sitio del Instituto Salesiano de Educación en Línea

Clon rediseñado y exclusivo del apartado **ISEL** de la Universidad Mesoamericana
(https://www.umes.edu.gt/isel-umes). No incluye ninguna otra sección de la
universidad (Inicio, Nosotros, Facultades, Admisión general, etc.) — este sitio
es 100% independiente y dedicado a ISEL.

## Fase actual

**Fase 1 — Página principal de ISEL**: Hero, Programas (6 maestrías + página de
"Información" de cada una con Pensum / Inscripción / Asignación), Metodología,
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

Requisitos: **Node.js LTS**, **pnpm**, **.NET 8 SDK** y **LibreOffice**
instalados (LibreOffice solo hace falta para que el admin pueda imprimir
fichas en PDF — ver más abajo; `winget install TheDocumentFoundation.LibreOffice`
en Windows).

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

- **Pensum (PDF)** de cada maestría: actualmente apunta a los PDF ya
  publicados en umes.edu.gt. Reemplázalos por tus propios archivos cuando
  los tengas, en los mismos dos archivos (`pensumUrl` / `PensumUrl`).
- **Inscripción**: ya está habilitado — lleva al wizard público `/inscripcion`
  (preinscripción, asignación de cursos, carta de compromiso y documentos).

## Portal ISEL (alumno y administrador)

Un solo campo de texto decide a dónde va el usuario — no hay contraseña:

- **Carné de un alumno real** (de `Data/Seed/students.seed.json`, p. ej.
  `202630503`) → entra a su ficha de asignación de cursos.
- **El código de administrador** (`AdminAccess:Code` en
  `backend/UmesIsel.Api/appsettings.json`, por defecto `ADMINISEL2026`) →
  entra al panel administrativo. Cámbialo ahí cuando quieras.

### Alumno (`/portal/estudiante`)
Ve sus datos (de la base de datos, no editables). **"Cursos por
asignarse"** es una lista numerada con **solo las maestrías que tienen
pénsum real cargado** (no diplomados ni grupos de cohorte del roster, como
"INGLÉS I Y III" — esos no son maestrías seleccionables aquí). Al entrar
por primera vez **no hay ninguna preseleccionada**; si el alumno ya tiene
una ficha guardada (de cualquier trimestre), esa es la que aparece marcada
al volver a entrar. Al tocar una maestría se abre una ventana con su
**Trimestre** (cascada según el pénsum real, ver `Data/CourseCatalogSeedData.cs`),
los **cursos de ese trimestre** (de una vez, no seleccionables uno por uno
— un trimestre se asigna completo) y la **Sección** a mano; el botón
**"Listo"** confirma y cierra la ventana, y esa maestría queda marcada en
verde en la lista con su trimestre.

En **"Cursos adicionales o cambio de sección"** empieza con un solo campo y
un botón **"+ Agregar otro"** para sumar más solo si hace falta. Cada fila
tiene dos modos: **"Curso adicional"** (buscador sobre el catálogo
completo, agrupado por Maestría · Trimestre — los encabezados de grupo no
se pueden seleccionar, solo los cursos) y **"Repetir trimestre"** (elige su
propia mini-cascada Maestría → Trimestre → Curso, independiente de la
selección principal — así se puede repetir un curso de cualquier
maestría/trimestre, no solo uno anterior de la carrera actual).

También marca las dos observaciones Sí/No, el **tipo de pago** (Link de
pago / Presencial — uso interno del admin, nunca aparece en la ficha
impresa), firma en **Firma digital** y da clic en **Guardar asignación**
(la fecha de la ficha siempre queda como el día en que se guardó/generó).
Vuelve a entrar con el mismo carné para ver/editar lo guardado.

### Administrador (`/portal/admin`)
- **Impresión de asignaciones**: por fecha exacta (como antes, "Cargar día")
  o con los atajos **HOY / SEMANA / MES**, más un filtro de **tipo de
  pago** (Todas / Link de pago / Presencial) — si no hay fichas de ese tipo
  en el rango, lo dice explícitamente. "Imprimir" (una fila) abre un
  **PDF listo para imprimir** en una pestaña nueva — el propio visor de PDF
  del navegador ya trae su botón de imprimir, sin tener que abrir Excel.
  Ese PDF sale de la **plantilla .xlsx oficial real**
  (`Resources/FichaTemplate.xlsx`, ver `Services/FichaXlsxBuilder.cs` — solo
  se rellenan las celdas de datos, nada de la plantilla se recrea a mano),
  convertida a PDF en el servidor con LibreOffice headless
  (`Services/FichaPdfBuilder.cs`). "Imprimir todas" abre un solo PDF
  combinado con todas las fichas del rango/filtro, una por página. El tipo
  de pago nunca se escribe en el archivo — es admin-only.
- **Alumnos**: tabla filtrable por carné, con **Agregar alumno** (pide todos
  los campos del Excel — carné, nombres, carrera, sección, trimestre,
  correos, celular) para no tener que tocar la base de datos a mano, más
  Editar/Eliminar y "Ver ficha" (abre/edita la ficha de ese alumno). Editar y
  Eliminar siempre piden confirmación en una alerta centrada en pantalla
  (nunca el `confirm()` nativo del navegador).

El catálogo de cursos (`Courses`, con Carrera/Trimestre/Nombre) ya no lo
administra nadie desde la interfaz — se carga una sola vez, al iniciar el
backend por primera vez, desde `backend/UmesIsel.Api/Data/CourseCatalogSeedData.cs`,
transcrito directamente de los pénsums oficiales de cada maestría. Para
corregir un curso, edita ese archivo (no la base de datos a mano) y borra
`isel.db` para que se vuelva a sembrar, o ajústalo con una migración si ya
hay fichas guardadas que no quieres perder.

## Notas de diseño

- Sin degradados: toda la paleta usa colores sólidos (`tailwind.config.js` →
  `theme.colors.isel`).
- Animaciones: reveal-on-scroll en toda la página, tilt 3D por cursor en
  tarjetas (no es un "aura" global, solo la tarjeta bajo el cursor reacciona),
  navbar que se transforma al hacer scroll, botones con micro-interacciones.
