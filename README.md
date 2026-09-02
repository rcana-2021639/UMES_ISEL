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

**Fase 3 — Los tres trámites públicos**: además de **Asignación** (alumnos con
carné), el sitio abre **Inscripción** (aspirantes de nuevo ingreso, sin carné,
entran con su DPI) y **Solicitud de título** (alumnos por graduarse, entran con
su carné). Los tres imprimen el FORMATO oficial de la universidad sin tocar su
diseño, y los tres tienen su pestaña en el panel de admin.

**Fase 4 — Pénsum editable**: el plan de estudios deja de estar clavado en el
código y pasa a una cuarta pestaña del panel (**Pénsum**), desde donde el admin
crea, renombra, archiva y borra carreras y edita sus cursos trimestre por
trimestre; los tres trámites leen de ahí en el acto. Entra también la
**Actualización profesional de la licenciatura en Teología con especialidad en
Pastoral** (el programa de los sacerdotes) con su roster y su pénsum de cuatro
trimestres.

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

Aparte va `Data/Seed/sacerdotes.seed.json` (26 alumnos de la Actualización en
Teología, hoja "Sacerdotes" del mismo Excel): ese sí se importa aunque la base
ya tenga alumnos, porque llegó después — se salta solo si la base ya tiene algún
alumno de esa carrera.

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

La pantalla de acceso tiene dos puertas separadas:

- **Soy alumno** — carné **+ correo institucional** (@umes.edu.gt; basta con lo
  que va antes de la arroba). Los carnés son correlativos, así que pedir solo el
  carné permitía entrar como cualquier alumno contando hacia arriba.
- **Administración** — usuario y contraseña. Son cuentas nombradas (ver
  `Models/Entities/AdminUser.cs`), no un código compartido: se sabe quién hizo
  cada cosa y se le puede quitar el acceso a una persona sin cambiarle la clave a
  todas. La primera se crea sola al arrancar; si no configuras
  `AdminAccess__BootstrapPassword`, se genera una y **se escribe en el log de
  arranque**.

Al entrar, el servidor emite un **token de sesión firmado** que el navegador
reenvía en `Authorization: Bearer`. Ese token es lo único que da acceso: el
servidor lo verifica y vuelve a leer el rol de la base en cada llamada, así que
desactivar una cuenta surte efecto al instante. Lo que hay guardado en el
navegador ya no decide nada.

> **Seguridad y despliegue**: todo lo relativo a salir a producción —dominio,
> HTTPS, variables de entorno, respaldos y la lista de comprobación del día del
> lanzamiento— está en **[DESPLIEGUE.md](DESPLIEGUE.md)**.

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
- **Inicio**: el resumen del trimestre (fichas de hoy, papelería pendiente,
  aspirantes a medias, último respaldo, y el desglose por carrera), la
  **exportación a CSV** de alumnos/fichas/inscripciones y la **carga masiva**
  desde el Excel del trimestre. La carga siempre hace primero una pasada en
  seco: enseña qué pasaría —altas, actualizaciones y filas que se omiten, con
  su motivo— y solo escribe si se confirma. Nunca borra a nadie.
- **Seguridad**: las cuentas del panel, la **bitácora** (quién entró, qué se
  borró, qué se exportó, y los intentos fallidos) y los **respaldos**.
- **Alumnos**: tabla con búsqueda en vivo por **carné, nombre o correo** y
  filtro por carrera, con **Agregar alumno** (pide todos
  los campos del Excel — carné, nombres, carrera, sección, trimestre,
  correos, celular) para no tener que tocar la base de datos a mano, más
  Editar/Eliminar y "Ver ficha" (abre/edita la ficha de ese alumno). Editar y
  Eliminar siempre piden confirmación en una alerta centrada en pantalla
  (nunca el `confirm()` nativo del navegador).

### Pénsum (pestaña del panel de admin)

El plan de estudios se edita **desde la interfaz**, en la pestaña **Pénsum**.
Ahí están todas las carreras —las seis maestrías, la Actualización en Teología
de los sacerdotes y los cursos sueltos de Inglés— con su pénsum abierto por
trimestres. Se puede: crear una carrera, renombrarla, archivarla, eliminarla, y
dentro de cada una agregar/editar/quitar cursos y trimestres enteros.

Lo que se guarde ahí sale **al instante** en los tres trámites (asignación,
inscripción y solicitud de título), porque los tres leen de la misma tabla
`Courses`: no hay una segunda copia del pénsum en el código.

Tres reglas que sostienen el módulo (ver `Services/PensumService.cs`):

- **Renombrar arrastra.** El nombre de la carrera es la clave con la que
  consulta media aplicación (`Students.Carrera`, `CourseAssignments.Carrera`,
  `Preinscripciones.Carrera`…). Al renombrar se actualizan las ocho tablas que
  lo guardan, en una sola transacción. Si no, los alumnos quedarían apuntando a
  una carrera inexistente y su pénsum saldría vacío.
- **Borrar ≠ archivar.** Una carrera con alumnos, fichas o expedientes NO se
  puede borrar (el servidor responde 409 diciendo cuántos la usan); la salida es
  **archivarla**: desaparece de los formularios y el historial sigue en pie.
- **Las fichas ya guardadas no se tocan.** Cambiar el pénsum no reescribe una
  ficha firmada: sigue diciendo lo que decía el día que se imprimió.

El punto de partida sigue siendo `Data/CourseCatalogSeedData.cs`, pero ya solo
se usa la primera vez que la base ve una carrera (ver `DbInitializer.SeedPensum`):
nunca pisa lo que el admin haya editado, y si borra una carrera a propósito,
reiniciar el backend no la resucita.

Todos los endpoints de escritura del pénsum exigen el código de administrador en
la cabecera `X-Admin-Code` (`Security/AdminOnlyAttribute.cs`); el frontend lo
manda solo desde una sesión de admin (`lib/http.ts`).

## Solicitud de impresión de título (`/solicitud-titulo`)

El alumno entra **con su carné** y la ficha ya viene con su carné, sus nombres,
sus apellidos, su carrera y la fecha del día. Solo hay una solicitud viva por
alumno: volver a entrar con el mismo carné la reanuda.

Lo particular de este FORMATO es que el carné, los nombres y los apellidos van
**letra por letra**, una por casilla (13, 37 y 37). El formulario dibuja esas
mismas casillas en vivo debajo de cada campo, así que se ve el nombre tal como
va a quedar impreso y el límite se nota antes de chocarse con él.

La **fotografía** se toma con la cámara del dispositivo o se sube desde un
archivo; en los dos casos pasa por el mismo encuadre de proporción fija
(3.5 × 4.5 cm, la medida del recuadro del papel) con zoom y arrastre, y sale
recortada a 700 × 891 px. Una imagen de más de 12 MB se rechaza; el resto se
reencuadra solo. Si no hay cámara o se niega el permiso, la pantalla lo dice y
ofrece la subida.

El PDF sale **en una sola hoja**, con las casillas de sede, ceremonia y sexo
marcadas sobre el propio recuadro del documento (ver
`tools/docx-templates/README.md`), la foto pegada en su hueco y la firma sobre
el renglón de "Firma del Interesado".

En el panel de admin, la pestaña **Solicitudes de título** tiene lo mismo que
las otras dos: impresión filtrable por fecha y estado, tabla completa, ver y
editar la ficha, imprimir una o todas, y un botón **Entregada** para cuando
Secretaría ya la recibió.

## Notas de diseño

- Sin degradados: toda la paleta usa colores sólidos (`tailwind.config.js` →
  `theme.colors.isel`).
- Animaciones: reveal-on-scroll en toda la página, tilt 3D por cursor en
  tarjetas (no es un "aura" global, solo la tarjeta bajo el cursor reacciona),
  navbar que se transforma al hacer scroll, botones con micro-interacciones.
- **Metodología** no lleva imágenes: es tipografía sobre el fondo, sin tarjeta,
  con un filete vertical que se llena del color del paso activo. El movimiento
  son tres capas que no compiten por la misma propiedad — entrada (una vez),
  parallax de lectura sobre el encabezado, y el encendido palabra a palabra del
  párrafo con el scroll.
- El navbar lleva un botón **Canvas** (aula virtual, se abre en otra pestaña).
  Va en el grupo de acciones de la derecha y no dentro de `<nav>`, para que la
  píldora deslizante que marca la sección activa no lo cuente y la animación de
  la barra quede igual.
