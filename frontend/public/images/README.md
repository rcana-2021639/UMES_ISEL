# Dónde va cada imagen

Todo vive dentro de **`frontend/public/images/`**.
En esta máquina, la ruta completa es:

```
C:\Users\Usuario\Desktop\UMES_ISEL\frontend\public\images\
```

## La extensión ya no importa

El componente que dibuja las imágenes (`frontend/src/components/ui/ImageSlot.tsx`)
prueba el **mismo nombre base** con varias extensiones antes de dar la imagen por
ausente, en este orden:

```
.jpg → .jpeg → .png → .webp → .avif
```

Es decir: **basta con que el NOMBRE coincida**. Si tu foto del director es
`rolando-valdez.png` y en el código dice `.avif`, funciona igual. No hay que
tocar nada.

La única excepción es el favicon (ver más abajo), porque ese no pasa por
`ImageSlot` sino por una etiqueta `<link>` directa en `index.html`.

## Tabla completa

| Archivo (nombre base) | Carpeta | Dónde se usa | Relación / tamaño |
|---|---|---|---|
| `hero-principal` | `hero/` | Fondo de la portada | 16:9 — 1920×1080 |
| `logo-isel` | `hero/` | Navbar, footer, portal, acceso | Cuadrado, fondo transparente, mín. 200×200 |
| `logo-umes` | `hero/` | Footer | Cuadrado, fondo transparente, mín. 200×200 |
| `favicon.png` | `hero/` | Ícono de la pestaña — **tiene que ser .png** | 512×512 |
| `rolando-valdez` | `advisor/` | Retrato del Director en “Dirección” | 4:5 (vertical) — 800×1000 |
| `inscripcion` | `admission/` | Imagen del CTA de inscripción | 4:5 (vertical) — 1000×1250 |
| `sesiones-sincronicas` | `methodology/` | Metodología · paso 1 | 16:10 — 1200×750 |
| `trabajo-asincronico` | `methodology/` | Metodología · paso 2 | 16:10 — 1200×750 |
| `tutoria` | `methodology/` | Metodología · paso 3 | 16:10 — 1200×750 |
| `docencia-superior` | `programs/` | Tarjeta de la maestría | 4:3 — 1200×900 |
| `docencia-superior-detalle` | `programs/` | Cabecera de su página | 16:9 — 1600×900 |
| `administracion-empresas` | `programs/` | Tarjeta | 4:3 — 1200×900 |
| `administracion-empresas-detalle` | `programs/` | Cabecera | 16:9 — 1600×900 |
| `marketing-digital` | `programs/` | Tarjeta | 4:3 — 1200×900 |
| `marketing-digital-detalle` | `programs/` | Cabecera | 16:9 — 1600×900 |
| `fintech` | `programs/` | Tarjeta | 4:3 — 1200×900 |
| `fintech-detalle` | `programs/` | Cabecera | 16:9 — 1600×900 |
| `talento-humano` | `programs/` | Tarjeta | 4:3 — 1200×900 |
| `talento-humano-detalle` | `programs/` | Cabecera | 16:9 — 1600×900 |
| `auditoria-desempeno` | `programs/` | Tarjeta | 4:3 — 1200×900 |
| `auditoria-desempeno-detalle` | `programs/` | Cabecera | 16:9 — 1600×900 |

Mientras un archivo no exista, esa zona muestra un marcador con el nombre que
espera — no se ve rota.

## Si quieres CAMBIAR un nombre (no la extensión)

Solo hace falta si el nombre base va a ser distinto. Cada imagen se declara en
un único sitio, salvo las de programas, que están en dos:

| Imagen | Archivo del código |
|---|---|
| Fondo de portada | `frontend/src/components/sections/Hero.tsx` (líneas 133 y 251) |
| Logo ISEL | `frontend/src/components/layout/Navbar.tsx`, `layout/Footer.tsx`, `portal/PortalShell.tsx`, `pages/portal/LoginPage.tsx` |
| Logo UMES | `frontend/src/components/layout/Footer.tsx` |
| Favicon | `frontend/index.html` (etiqueta `<link rel="icon">`) |
| Director | `frontend/src/components/sections/AdvisorSection.tsx` |
| Admisión | `frontend/src/components/sections/AdmissionCta.tsx` |
| Metodología (3) | `frontend/src/components/sections/MethodologySection.tsx` |
| Programas (12) | `frontend/src/data/programs.ts` **y** `backend/UmesIsel.Api/Data/IselSeedData.cs` |

⚠️ Las de programas van en los dos archivos porque la API es la que entrega la
lista de maestrías cuando el backend está encendido, y `programs.ts` es el
respaldo local cuando no lo está. Si cambias el nombre en uno solo, la imagen
aparecerá en un caso y no en el otro.
