# UMES ISEL — Sitio del Instituto Salesiano de Educación en Línea

Clon rediseñado y exclusivo del apartado **ISEL** de la Universidad Mesoamericana
(https://www.umes.edu.gt/isel-umes). No incluye ninguna otra sección de la
universidad (Inicio, Nosotros, Facultades, Admisión general, etc.) — este sitio
es 100% independiente y dedicado a ISEL.

## Fase actual

**Fase 1 — Página principal de ISEL**: Hero, Programas (6 maestrías + página de
"Información" de cada una con Pensum / Entrevista / Inscripción), Metodología,
Objetivos, Dirección académica y CTA de admisión.

## Stack

- **Backend**: ASP.NET Core Web API (.NET 8) — `backend/UmesIsel.Api`
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion — `frontend/`

## Estructura

```
UMES_PAGISEL/
├── backend/UmesIsel.Api/       # API .NET — expone /api/programs
│   ├── Controllers/
│   ├── Models/
│   └── Data/                   # contenido real de las 6 maestrías (seed)
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
        │   └── ui/             # botones, cards, reveal-on-scroll, tilt 3D...
        ├── pages/               # HomePage, ProgramDetailPage ("Información")
        ├── data/                # copia local de los programas (fallback)
        ├── hooks/useTilt.ts     # tilt 3D con el cursor (sin "aura")
        └── lib/api.ts           # fetch al backend con fallback automático
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
- **Inscripción**: botón visible pero deshabilitado ("Próximamente") — se
  habilitará cuando exista ese flujo.

## Notas de diseño

- Sin degradados: toda la paleta usa colores sólidos (`tailwind.config.js` →
  `theme.colors.isel`).
- Animaciones: reveal-on-scroll en toda la página, tilt 3D por cursor en
  tarjetas (no es un "aura" global, solo la tarjeta bajo el cursor reacciona),
  navbar que se transforma al hacer scroll, botones con micro-interacciones.
