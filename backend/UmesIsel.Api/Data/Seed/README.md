# Seed de estudiantes

`students.seed.json` es una limpieza de la hoja **"HOJA 1"** del archivo
`III Trimestre 2026 - Procesos de inscripción y asignación de cursos.xlsx`
que el usuario proporcionó. Se generó una sola vez con un script Node
(no forma parte del build) que:

- Recorre cada bloque de "Hoja1" (un bloque = una maestría/diplomado, con su
  propio título y fila de encabezados).
- Descarta filas sin carné válido (no pueden iniciar sesión) y de-duplica por
  carné (algunos alumnos aparecen dos veces porque además cursan "INGLÉS I y
  III"; se conserva su primera aparición/carrera).
- Separa "Nombre Completo" ("Apellidos, Nombres") en Primer/Segundo apellido y
  Primer/Segundo nombre de forma heurística (por comas y espacios) — el admin
  puede corregir cualquier nombre mal separado desde el CRUD.

`DbInitializer.SeedIfEmpty` importa este archivo a la base de datos SQLite
**solo si la tabla `Students` está vacía** (primera vez que se corre la app),
así que nunca sobrescribe cambios hechos luego desde el panel de admin.

Para volver a generar este archivo desde un Excel actualizado, repite el
mismo proceso (parsear "Hoja1", limpiar celulares/correos, separar nombres,
descartar filas sin carné) y reemplaza este JSON.

## `sacerdotes.seed.json`

La hoja **"Sacerdotes"** del mismo Excel: el roster de la *Actualización
profesional de la licenciatura en Teología con especialidad en Pastoral*. Se
genera con `tools/docx-templates/prepare-sacerdotes-seed.mjs` (Node + exceljs, fuera del
build) y `DbInitializer.SeedRosterDeCarrera` lo importa **aunque la tabla
`Students` ya tenga filas** — llegó después que el roster principal. La
condición de "ya se importó" es que exista al menos un alumno de esa carrera,
así que corre una sola vez y no resucita a quien el admin dé de baja.

De las 45 filas de la hoja entran **26**. Las otras 19 no pueden entrar porque
el carné es la llave de acceso al portal y no la tienen:

- **18 sin carné** (celda vacía) — el script las lista al correr.
- **1 con el carné literal `PENDIENTE`** (Pérez Recinos Fredy Josué).
- **1 con carné repetido**: `2026101516` aparece en dos filas, la de *Chub
  Ichich Leonardo* y la de *Higueros Monroy Jimy Omar*. Se conserva la primera;
  la otra hay que darla de alta desde el panel cuando se corrija el Excel.

En cuanto tengan carné se agregan desde **Panel → Alumnos → Agregar alumno**,
sin tocar este archivo.

### Cómo se parte el nombre

La hoja escribe el nombre corrido y sin coma, y no siempre en el mismo orden
(la mayoría "Apellido1 Apellido2 Nombre1 Nombre2", unos pocos al revés). El
desempate es el **correo institucional**, que pega apellido y nombre: dice cuál
de los dos bandos es el apellido. Los que no se dejan partir por esa regla van a
mano en el `OVERRIDES` del script. Cualquier reparto que salga mal se corrige
desde el CRUD del panel, no aquí.
