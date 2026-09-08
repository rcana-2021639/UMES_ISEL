# Plantillas de las fichas (.docx)

Las fichas de **Preinscripción**, **Carta de Compromiso** y **Solicitud de Impresión de Título** que
imprime el sistema son los `.docx` oficiales de la universidad, sin un solo cambio de diseño. Lo
único que se les hizo, una vez, fue insertar marcadores de texto `{{CAMPO}}` en los espacios en
blanco (celdas vacías, renglones subrayados) y junto a cada casilla del checklist.

En producción, llenar una ficha es solo reemplazar cada `{{CAMPO}}` por su valor
(ver `backend/UmesIsel.Api/Services/DocxCellSurgery.cs` y los dos builders), y convertirla a PDF con
LibreOffice — igual que ya se hacía con la ficha de Asignación en Excel.

Resultado: cada ficha sale **en una sola hoja**, en **vertical**, con el formato original intacto.
(La de Asignación sigue siendo el `.xlsx` oficial, en horizontal — esa no cambió.)

## Las casillas van marcadas por dentro

Ninguna de las tres fichas dibuja sus casillas con caracteres, así que escribir un "✓" junto a la
etiqueta dejaba la marca **fuera** del recuadro. Cada plantilla se marca por dentro, según cómo esté
dibujado su recuadro:

- **Preinscripción** y **Solicitud de Título**: el recuadro es una imagen. Cada casilla tiene su
  propia relación (`rIdChkPuebloLadino`, `rIdChkAlergiaNo`, …) y marcarla es apuntar esa relación al
  PNG marcado, que es el mismo recuadro con una X dibujada dentro (`png-check.mjs`). Preinscripción
  usa dos recuadros de distinto tamaño, así que tiene dos PNG marcados
  (`casillaMarcada4.png` y `casillaMarcada5.png`).
- **Carta de Compromiso**: el recuadro es una forma, no una imagen. Cada uno lleva dentro un cuadro
  de texto centrado con su token (`{{DOC_DPI}}`, …), que el backend resuelve a `X` o a nada.

## La Solicitud de Título, aparte

Esa ficha necesita tres cosas que las otras no:

- **Rejillas de una letra por casilla** (13 para el carné, 37 para nombres y 37 para apellidos).
  Cada casilla lleva su propio token (`{{C0}}…`, `{{N0}}…`, `{{A0}}…`) y el builder reparte el texto
  carácter a carácter.
- **Casillas que son imágenes**, no texto. Escribirles un "✓" al lado dejaría la marca fuera del
  recuadro, así que cada casilla marcable recibe su propia relación de imagen (`rIdChkCampusCentral`,
  `rIdChkSexoF`, …) y marcarla es apuntar esa relación a `media/casillaMarcada.png` — que es el
  MISMO recuadro del documento con una X dibujada dentro (`png-check.mjs`). Cero desplazamiento.
- **Una fotografía** encajada en el recuadro "PEGAR FOTOGRAFÍA RECIENTE", como imagen flotante.

Por eso su script recibe la CARPETA descomprimida (toca `word/document.xml`,
`word/_rels/document.xml.rels` y `word/media/`), no solo el `document.xml`:

```bash
node prepare-solicitud-titulo.mjs <carpeta>
node zip-dir.mjs <carpeta> ../../backend/UmesIsel.Api/Resources/SolicitudTituloTemplate.docx
```

## Cuándo hay que volver a correr esto

Solo si la universidad cambia el FORMATO oficial de alguna de las fichas. En ese caso:

1. Descomprime el `.docx` nuevo en una carpeta (es un zip).
2. Ajusta los offsets del script correspondiente — están anotados campo por campo y salen de
   inspeccionar `word/document.xml`.
3. Corre el script y vuelve a empaquetar:

```bash
node prepare-preinscripcion.mjs <carpeta>
```

(Este también recibe la CARPETA descomprimida, no solo el `document.xml`: toca además
`word/_rels/document.xml.rels` y `word/media/` para las casillas. Los dos scripts son idempotentes:
si la carpeta ya trae los tokens, solo rehacen la parte de las casillas.)

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
