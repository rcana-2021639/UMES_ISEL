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
