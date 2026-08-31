# Imágenes — Programas (tarjetas + detalle de cada maestría)

Cada maestría usa **dos** imágenes: una para la tarjeta en la grilla de "Programas" y otra
más grande para su página de "Información". Nombres exactos esperados:

| Maestría | Imagen de tarjeta | Imagen de detalle |
|---|---|---|
| Innovación de los Aprendizajes en la Educación Superior | `docencia-superior.avif` | `docencia-superior-detalle.avif` |
| Administración de Empresas e Inteligencia de Negocios | `administracion-empresas.jpg` | `administracion-empresas-detalle.jpg` |
| Marketing Digital y Comercio Electrónico | `marketing-digital.jpg` | `marketing-digital-detalle.jpg` |
| Finanzas y Tecnología (FINTECH) | `fintech.jpg` | `fintech-detalle.jpg` |
| Gestión Estratégica del Talento Humano | `talento-humano.jpg` | `talento-humano-detalle.jpg` |
| Auditoría de Desempeño | `auditoria-desempeno.jpg` | `auditoria-desempeno-detalle.jpg` |

- Tarjeta: relación 4:3, recomendado 1200×900.
- Detalle: relación 16:9, recomendado 1600×900.

Si necesitas cambiar algún nombre, edítalo en `frontend/src/data/programs.ts`
(campos `cardImage` / `detailImage`) — es el único lugar donde se referencian.

> La extension no importa: se prueba el mismo nombre con .jpg, .jpeg, .png,
> .webp y .avif. Ver la tabla completa en `frontend/public/images/README.md`.
