# Plantillas de las fichas de Inscripción

Las fichas de **Preinscripción** y **Carta de Compromiso** que imprime el sistema son los `.docx`
oficiales de la universidad, sin un solo cambio de diseño. Lo único que se les hizo, una vez, fue
insertar marcadores de texto `{{CAMPO}}` en los espacios en blanco (celdas vacías, renglones
subrayados) y junto a cada casilla del checklist.

En producción, llenar una ficha es solo reemplazar cada `{{CAMPO}}` por su valor
(ver `backend/UmesIsel.Api/Services/DocxCellSurgery.cs` y los dos builders), y convertirla a PDF con
LibreOffice — igual que ya se hacía con la ficha de Asignación en Excel.

Resultado: cada ficha sale **en una sola hoja**, en **vertical**, con el formato original intacto.
(La de Asignación sigue siendo el `.xlsx` oficial, en horizontal — esa no cambió.)

## Cuándo hay que volver a correr esto

Solo si la universidad cambia el FORMATO oficial de alguna de las dos fichas. En ese caso:

1. Descomprime el `.docx` nuevo en una carpeta (es un zip).
2. Ajusta los offsets del script correspondiente — están anotados campo por campo y salen de
   inspeccionar `word/document.xml`.
3. Corre el script y vuelve a empaquetar:

```bash
node prepare-preinscripcion.mjs <carpeta>/word/document.xml
```

```bash
node zip-dir.mjs <carpeta> ../../backend/UmesIsel.Api/Resources/PreinscripcionTemplate.docx
```

`zip-dir.mjs` existe porque `Compress-Archive` de PowerShell escribe rutas con `\` y ni Word ni
LibreOffice abren el archivo resultante.

## Cómo verificar

Convierte la plantilla ya llena a PDF y míralo — debe ser **una** página:

```bash
soffice --headless --convert-to pdf --outdir . ficha-llena.docx
```
