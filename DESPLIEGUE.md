# Salida a producción — ISEL

Guía para publicar el sitio con un dominio real y dejar la base de datos en
condiciones de aguantar. Está escrita para seguirse de arriba abajo el día del
despliegue.

---

## 0. Lo que NO puede saltarse

Cuatro cosas. Si falta una, se sale a producción con un agujero:

| # | Qué | Por qué |
|---|---|---|
| 1 | `Security__TokenSecret` | Firma las sesiones. Si no se pone, la app genera una clave y la guarda en un archivo — funciona, pero se pierde si se reinstala el servidor y hay que respaldarla aparte. |
| 2 | `AdminAccess__BootstrapPassword` | La contraseña del primer administrador. Si no se pone, se genera una y **se escribe en el log de arranque**: hay que ir a leerla ahí. |
| 3 | `Cors__Origins__0` | El dominio real del sitio. Si falta, la página carga pero **ningún formulario guarda** — el navegador bloquea las llamadas y el error es difícil de diagnosticar. |
| 4 | HTTPS | Sin él, el carné, el correo y el token de sesión de cada alumno viajan en texto plano por la red del campus. |

---

## 1. Elegir dónde vive

La pregunta que decide todo lo demás es si el servidor tiene **un disco propio
que persiste entre reinicios y despliegues**. SQLite es un archivo: si el disco
se borra al redesplegar, se borra la base de datos.

| Opción | ¿Sirve SQLite? | Notas |
|---|---|---|
| **VPS Linux** (DigitalOcean, Hetzner, Linode, AWS Lightsail) | ✅ Sí | La más recomendable. Disco propio, control total, ~6-12 USD/mes. |
| **Servidor Windows de la universidad + IIS** | ✅ Sí | Perfecto si ya lo tienen. Ver §4B. |
| **Docker con volumen persistente** | ✅ Sí | Hay que montar `/app/App_Data` como volumen. Sin volumen, se pierde todo. |
| **Azure App Service / AWS Elastic Beanstalk** | ⚠️ Con cuidado | Sirve solo con almacenamiento persistente montado y **una sola instancia**. Si escala a dos, SQLite se corrompe. |
| **Vercel / Netlify / Cloudflare Pages** | ❌ **No** | Son para sitios estáticos y funciones sin disco. Aquí el backend no puede vivir. El *frontend* sí. |
| **Hosting compartido tipo cPanel** | ❌ Casi nunca | Rara vez corren .NET 8. |

> **Si la empresa da un hosting de los ❌**, hay dos caminos: publicar solo el
> frontend ahí y el backend en un VPS aparte, o migrar la base a PostgreSQL.
> La migración es real pero acotada: EF Core abstrae casi todo, y el trabajo
> son las migraciones y un par de detalles de tipos. **Pregúntame antes de
> empezarla**; no es algo que convenga improvisar la víspera.

> **Si no van a dar ningún dominio ni servidor, salta a §1-ter**: Cloudflare
> Pages + Fly.io, gratis, con HTTPS y con direcciones que no caducan. Es el
> camino recomendado y está explicado paso a paso.

### Caso concreto: InfinityFree

InfinityFree es **PHP 8.3 + MySQL**, y nada más. No corre .NET, no da acceso SSH
y no deja instalar binarios (LibreOffice, que es lo que genera los PDF, queda
descartado de entrada). **El backend no puede vivir ahí.** No es una limitación
del plan gratuito: es que ese servidor no habla ese idioma.

Lo que sí funciona, y es lo que hay que hacer: **partir el despliegue en dos**.

```
   Alumno  ──►  https://tusitio.infinityfreeapp.com     (InfinityFree)
                └── frontend/dist — HTML, CSS, JS estáticos
                             │
                             │  llamadas a la API
                             ▼
                https://umes-isel-api.fly.dev           (Fly.io u otro)
                └── el backend .NET + SQLite + LibreOffice
```

Es un montaje normal y perfectamente válido: el sitio y la API en dominios
distintos, hablando por HTTPS. Lo único que hay que recordar es poner el
dominio de InfinityFree en `Cors__Origins__0`, o el navegador bloqueará las
llamadas.

**Dónde poner el backend, para probar y gratis:**

| Opción | Ventaja | Pega |
|---|---|---|
| **Fly.io** (recomendado) | Docker, volumen persistente, HTTPS incluido. El `Dockerfile` del repo funciona tal cual. | Pide tarjeta para verificar, aunque el uso pequeño no se cobra. |
| **Oracle Cloud Always Free** | Una máquina de verdad, gratis para siempre y con buenos recursos. | Más pasos: es montar un VPS entero (§4A). |
| **Railway / Koyeb / Render** | Muy fáciles. | En el plan gratis el disco NO persiste o el servicio se duerme: **la base de datos se pierde**. Solo para una demo de un rato. |
| **MonsterASP.NET (gratis)** | Hecho para .NET. | Sin LibreOffice: todo funciona menos generar PDF. |

---

## 1-bis. Despliegue partido: InfinityFree + Fly.io

### Paso 1 — el backend en Fly.io

```bash
# Instalar la herramienta (una vez)
#   Windows PowerShell:  iwr https://fly.io/install.ps1 -useb | iex
#   Linux/macOS:         curl -L https://fly.io/install.sh | sh

fly auth signup          # o `fly auth login` si ya tienes cuenta

# Desde la raíz del repositorio (donde está el Dockerfile)
fly launch --no-deploy --name umes-isel-api --region mia
```

Cuando pregunte si crea una base de datos Postgres o Redis, di que **no**: la
base es SQLite y va en el volumen.

```bash
# Disco persistente. SIN ESTO se pierde todo en cada despliegue.
fly volumes create isel_data --size 1 --region mia

# Los secretos (nunca en el repositorio)
fly secrets set \
  Security__TokenSecret="$(openssl rand -base64 48)" \
  AdminAccess__BootstrapUser="tu.usuario" \
  AdminAccess__BootstrapPassword="una contraseña larga que elijas tú" \
  Cors__Origins__0="https://tusitio.infinityfreeapp.com" \
  Hosting__BehindReverseProxy=true

fly deploy
```

El archivo `fly.toml` que genera `fly launch` hay que ajustarlo para que monte
el volumen y no apague la máquina (si se apaga, se pierde el respaldo
programado):

```toml
[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false     # que no se duerma: hay respaldos programados
  min_machines_running = 1

[[mounts]]
  source = "isel_data"
  destination = "/data"          # coincide con el VOLUME del Dockerfile

[[vm]]
  memory = "1gb"                 # LibreOffice necesita margen; con 256 MB falla
```

Comprueba que arrancó y **anota la contraseña del primer administrador**:

```bash
fly logs | grep -A6 "CUENTA DE ADMINISTRADOR"
curl -i https://umes-isel-api.fly.dev/api/programs     # debe dar 200
```

### Paso 2 — el frontend en InfinityFree

```bash
cd frontend
cp .env.production.example .env.production
# edita .env.production y pon:  VITE_API_URL=https://umes-isel-api.fly.dev
pnpm install
pnpm run build          # deja todo en frontend/dist
```

En el panel de InfinityFree:

1. **Crear la cuenta de hosting** y anotar el subdominio que te dan
   (`tusitio.infinityfreeapp.com`) o conectar tu dominio propio.
2. Entrar al **File Manager** (o por FTP con FileZilla, que es más cómodo para
   subir muchos archivos).
3. Subir **el contenido de `frontend/dist`** dentro de la carpeta **`htdocs`**.
   Ojo: el contenido, no la carpeta `dist` — en `htdocs` tienen que quedar
   `index.html`, `assets/`, `images/` y `.htaccess` sueltos.
4. Comprobar que `.htaccess` subió: los clientes FTP a veces ocultan los
   archivos que empiezan por punto. En FileZilla, *Servidor → Forzar mostrar
   archivos ocultos*. **Sin ese archivo, recargar en `/portal/admin` da 404.**
5. Borrar el `index2.html` de bienvenida que InfinityFree deja puesto.
6. En **SSL/TLS** del panel, emitir el certificado gratis y esperar a que se
   active (suele tardar unos minutos).

### Paso 3 — enlazarlos

El backend ya tiene el dominio del frontend en `Cors__Origins__0` (paso 1). Si
lo cambias:

```bash
fly secrets set Cors__Origins__0="https://tu-dominio-nuevo"
```

### Comprobación

Abre el sitio, entra como alumno y guarda algo. Si la página carga pero **ningún
formulario guarda**, abre la consola del navegador (F12):

- `CORS policy` → falta tu dominio en `Cors__Origins__0`.
- `Mixed Content` → `VITE_API_URL` quedó en `http://`; tiene que ser `https://`.
- `404` al recargar en una ruta interna → falta el `.htaccess`.

### Lo que hay que saber del plan gratuito de InfinityFree

- Corta las visitas si el sitio recibe mucho tráfico de golpe. Para probar y
  para el volumen de ISEL (170 alumnos) va bien; para el día de inscripciones
  puede quedarse corto.
- Algunos planes gratuitos muestran una página de "verificación" antes de dejar
  entrar. Es molesto pero no rompe nada.
- **No subas nada del backend ahí**: ni `isel.db`, ni `App_Data`, ni el
  `appsettings.json`. Ese servidor sirve archivos por HTTP y cualquiera podría
  descargarse la base de datos entera escribiendo su nombre en la barra.

### ¿Aguanta SQLite este proyecto?

Sí, y con holgura. Para 170 alumnos, con picos de decenas de personas guardando
su ficha el mismo día, SQLite en modo WAL va sobrado — es el mismo motor que
llevan los aviones y los teléfonos. Los dos fallos clásicos que sí lo tumban ya
están cerrados en el código:

- **Ruta relativa** → resuelta contra la carpeta de la aplicación (`Program.cs`).
  Sin esto, el servidor crea una base vacía en otro sitio y parece que "se
  borraron todos los alumnos".
- **Bloqueos de escritura** → `journal_mode=WAL` y 30 s de espera. Sin esto, dos
  personas guardando a la vez producen *"database is locked"*.

El límite real de SQLite aquí no es el número de alumnos: es **tener más de una
instancia de la aplicación escribiendo el mismo archivo**. No lo hagan.

---

## 1-ter. El camino recomendado si NO hay dominio propio: Cloudflare Pages + Fly.io

Este es el montaje que hay que seguir cuando nadie va a dar un dominio de la
universidad. Sale **gratis**, con **HTTPS**, y las dos direcciones son
**permanentes**: no caducan, no piden renovación anual y no se desactivan por
falta de uso.

```
   Alumno ──► https://umes-isel.pages.dev      (Cloudflare Pages — el sitio)
                        │
                        │ llamadas a la API por HTTPS
                        ▼
              https://umes-isel-api.fly.dev    (Fly.io — backend + SQLite + LibreOffice)
```

### Por qué estas dos y no otras

| Servicio | Dirección que da | ¿Caduca? | Por qué se eligió |
|---|---|---|---|
| **Cloudflare Pages** | `<proyecto>.pages.dev` | No | Gratis de verdad, sin anuncios, sin páginas de "verificación", sin corte por tráfico, HTTPS automático. Sustituye a InfinityFree con ventaja en todo. |
| **Fly.io** | `<app>.fly.dev` | No | Corre Docker con **disco persistente**, que es lo único que aguanta SQLite. Pide tarjeta para verificar identidad; el uso de este proyecto entra en el tramo que no se cobra. |

Sobre "un dominio gratis con nombre propio" (tipo `.tk`, `.ml`, `.ga`):
**ya no existe**. Freenom, que era el único que los daba, dejó de registrar
dominios nuevos y los que quedaban se fueron cayendo — justo el problema de
"se desactiva a cada rato" que hay que evitar. Si más adelante quieren un
nombre propio (`isel-umes.site`, por ejemplo), un dominio barato cuesta entre
2 y 12 USD al año y se enchufa a este mismo montaje sin tocar el código: se
apunta en Cloudflare y se cambia `Cors__Origins__0`. Mientras tanto,
`pages.dev` es una dirección seria y estable.

### Paso 1 — subir el backend a Fly.io

Todo esto es en la **raíz del repositorio** (donde está el `Dockerfile`).

```bash
# 1. Instalar la herramienta (una sola vez, en PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# 2. Crear la cuenta / entrar
fly auth signup        # si ya tienes cuenta: fly auth login

# 3. Crear la aplicación SIN desplegarla todavía
fly launch --no-deploy --name umes-isel-api --region mia
```

Cuando pregunte si quiere crear Postgres o Redis, responder **que no**: la base
de datos de este proyecto es un archivo SQLite y va en el volumen del paso
siguiente.

```bash
# 4. El disco que sobrevive a los despliegues. SIN ESTO se pierde todo.
fly volumes create isel_data --size 1 --region mia
```

Abrir el `fly.toml` que acaba de generarse y dejar estas cuatro cosas puestas
(el resto del archivo se queda como está):

```toml
[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false     # que no se duerma: hay respaldos programados
  min_machines_running = 1

[[mounts]]
  source = "isel_data"
  destination = "/data"          # coincide con el VOLUME del Dockerfile

[[vm]]
  memory = "1gb"                 # LibreOffice necesita margen; con 256 MB falla
```

```bash
# 5. Los secretos. Nunca se escriben en el repositorio.
#    El dominio de Cors sale del paso 2; si aún no lo tienes, pon el que
#    piensas usar y lo corriges al final (paso 3).
fly secrets set `
  Security__TokenSecret="pega-aqui-una-cadena-larga-y-aleatoria" `
  AdminAccess__BootstrapUser="tu.usuario" `
  AdminAccess__BootstrapPassword="una contraseña larga que elijas tú" `
  Cors__Origins__0="https://umes-isel.pages.dev" `
  Hosting__BehindReverseProxy=true

# 6. Desplegar
fly deploy
```

> Para generar el `Security__TokenSecret` en Windows:
> `[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))`

Comprobar que arrancó:

```bash
fly logs                                          # busca "CUENTA DE ADMINISTRADOR"
curl -i https://umes-isel-api.fly.dev/api/programs # tiene que responder 200
```

**Anota la contraseña del primer administrador** que aparece en el log.

### Paso 2 — subir el frontend a Cloudflare Pages

```bash
cd frontend
copy .env.production.example .env.production
```

Editar `.env.production` y poner la dirección real del backend:

```
VITE_API_URL=https://umes-isel-api.fly.dev
```

```bash
pnpm install
pnpm run build          # deja el sitio compilado en frontend/dist
```

Ahora, en el navegador:

1. Entrar a <https://dash.cloudflare.com> y crear la cuenta (gratis, no pide
   tarjeta).
2. Menú lateral → **Workers & Pages** → **Create** → pestaña **Pages** →
   **Upload assets**.
3. Ponerle de nombre al proyecto `umes-isel` (ese nombre es el que decide la
   dirección: `umes-isel.pages.dev`).
4. Arrastrar **el contenido de `frontend/dist`** — los archivos sueltos
   (`index.html`, `assets/`, `images/`, `.htaccess`), **no** la carpeta `dist`.
5. **Deploy**. En menos de un minuto el sitio está en línea con HTTPS.

Cloudflare Pages ya sirve una aplicación de una sola página correctamente, así
que no hay que configurar nada más para que funcione recargar en
`/portal/admin`. (El `.htaccess` solo lo usa Apache; que viaje en la carpeta no
molesta.)

**Para publicar cambios más adelante**: `pnpm run build` otra vez y, en el mismo
proyecto de Pages, **Create new deployment** → subir el `dist` nuevo.

### Paso 3 — enlazar los dos

Si la dirección que quedó en Pages no es la que pusiste en el paso 1, corrígela:

```bash
fly secrets set Cors__Origins__0="https://umes-isel.pages.dev"
```

Cambiar un secreto reinicia la aplicación sola; no hay que volver a desplegar.

### Paso 4 — comprobar que todo quedó bien

1. Abrir `https://umes-isel.pages.dev` y entrar al portal.
2. Guardar una ficha de prueba y **volver a abrirla**: si los datos siguen ahí,
   la base está escribiendo en el volumen.
3. Descargar el PDF de esa ficha: si sale, LibreOffice quedó bien instalado.
4. Entrar al panel con el usuario administrador del paso 1.
5. `fly deploy` otra vez y repetir el punto 2: si la ficha sigue existiendo
   **después de redesplegar**, el volumen está bien montado. Esta es la prueba
   que de verdad importa.

Si el sitio carga pero ningún formulario guarda, abrir la consola del navegador
con F12:

- `CORS policy` → el dominio de Pages no coincide con `Cors__Origins__0`.
- `Mixed Content` → `VITE_API_URL` quedó en `http://`; tiene que ser `https://`.
- `Failed to fetch` → la aplicación de Fly está caída: `fly logs` para ver por qué.

### Paso 5 — dejar los respaldos andando

Los respaldos automáticos se guardan en `/data/backups`, dentro del volumen. Para
bajarse una copia a la computadora:

```bash
fly ssh sftp get /data/backups/<archivo>.db respaldo-local.db
```

Conviene hacerlo una vez al mes y guardarlo fuera de Fly.io — un volumen es un
disco, no un respaldo. Ver §5.

---

## 2. Dominio y DNS

Suponiendo `isel.umes.edu.gt` para el sitio y `api.isel.umes.edu.gt` para la API:

```
Tipo   Nombre        Valor                 TTL
A      isel          <IP del servidor>     3600
A      api.isel      <IP del servidor>     3600
```

Los dos pueden apuntar a la **misma máquina**: el servidor web separa por nombre.

> **No hace falta un dominio aparte para la base de datos.** La base es un
> archivo dentro del servidor, no un servicio al que nadie se conecte desde
> fuera — y no debe serlo. Si la empresa ofrece "un dominio para la base de
> datos", lo que probablemente ofrecen es un servidor de base de datos
> gestionado (PostgreSQL/MySQL); en ese caso avísame y evaluamos migrar.

También se puede servir todo desde un solo dominio, con la API bajo `/api`.
Tiene una ventaja concreta: **desaparece el problema de CORS**. Ver §4A.

---

## 3. Variables de entorno

Nunca en `appsettings.json` (eso va al repositorio). Se ponen en el sistema.

```bash
# Firma de las sesiones. Genera uno nuevo, no copies este texto:
#   openssl rand -base64 48
Security__TokenSecret="pega-aqui-48-bytes-aleatorios-en-base64"

# Primer administrador (solo se usa si no hay ninguna cuenta creada)
AdminAccess__BootstrapUser="tu.usuario"
AdminAccess__BootstrapPassword="una contraseña larga que elijas tú"

# El dominio del sitio. Sin esto, ningún formulario guarda.
Cors__Origins__0="https://isel.umes.edu.gt"

# Solo si hay Nginx / IIS-ARR / Cloudflare delante
Hosting__BehindReverseProxy=true

# Base de datos y respaldos en el disco persistente
ConnectionStrings__IselDb="Data Source=/var/isel/isel.db"
Backups__Directory="/var/isel/backups"
Backups__RetentionDays=30

ASPNETCORE_ENVIRONMENT=Production
```

`ASPNETCORE_ENVIRONMENT=Production` importa más de lo que parece: apaga Swagger
(que documenta y permite invocar toda la API desde el navegador) y activa la
política de seguridad estricta.

---

## 4. Montaje

### A. VPS Linux con Nginx (recomendado)

```bash
# 1. Publicar
dotnet publish backend/UmesIsel.Api -c Release -o /var/www/isel-api

# 2. Frontend
cd frontend
echo 'VITE_API_URL=https://isel.umes.edu.gt' > .env.production
pnpm install && pnpm run build      # deja el sitio en frontend/dist

# 3. LibreOffice (hace falta para generar los PDF)
sudo apt install -y libreoffice-calc libreoffice-writer

# 4. Carpeta de datos, del usuario que corre la app
sudo mkdir -p /var/isel && sudo chown www-data:www-data /var/isel
```

Servicio systemd en `/etc/systemd/system/isel-api.service`:

```ini
[Unit]
Description=ISEL API
After=network.target

[Service]
WorkingDirectory=/var/www/isel-api
ExecStart=/usr/bin/dotnet /var/www/isel-api/UmesIsel.Api.dll
Restart=always
RestartSec=10
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://127.0.0.1:5199
EnvironmentFile=/etc/isel-api.env      # aquí van las variables de §3

[Install]
WantedBy=multi-user.target
```

```bash
sudo chmod 600 /etc/isel-api.env       # las variables llevan secretos
sudo systemctl enable --now isel-api
```

Nginx, **todo bajo un solo dominio** (así no hay CORS):

```nginx
server {
    listen 443 ssl http2;
    server_name isel.umes.edu.gt;

    ssl_certificate     /etc/letsencrypt/live/isel.umes.edu.gt/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/isel.umes.edu.gt/privkey.pem;

    # TLS 1.0 y 1.1 están rotos: solo 1.2 y 1.3
    ssl_protocols TLSv1.2 TLSv1.3;

    # El frontend compilado
    root /var/www/isel-web;
    index index.html;

    # React Router: cualquier ruta desconocida la resuelve el navegador
    location / {
        try_files $uri $uri/ /index.html;
    }

    # La API, en el mismo dominio
    location /api/ {
        proxy_pass         http://127.0.0.1:5199;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Los PDF combinados de "Imprimir todas" pueden tardar
        proxy_read_timeout 120s;
        client_max_body_size 12M;
    }
}

# Todo lo que llegue por HTTP se manda a HTTPS
server {
    listen 80;
    server_name isel.umes.edu.gt;
    return 301 https://$host$request_uri;
}
```

Certificado gratis y con renovación automática:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d isel.umes.edu.gt
```

Con este montaje, `VITE_API_URL` es el propio dominio y `Cors__Origins__0`
sobra — pero déjalo puesto igual, no estorba.

### B. Servidor Windows con IIS

1. Instalar el **ASP.NET Core Hosting Bundle** de .NET 8 y LibreOffice.
2. `dotnet publish backend/UmesIsel.Api -c Release -o C:\inetpub\isel-api`
3. Crear el sitio en IIS apuntando ahí, con el **grupo de aplicaciones en
   "Sin código administrado"**.
4. Las variables de §3 van en *Configuración* → *Variables de entorno* del
   grupo de aplicaciones (o en `web.config`, dentro de
   `<environmentVariables>`).
5. Dar permiso de **escritura** a la identidad del grupo de aplicaciones sobre
   la carpeta de datos (`App_Data`, o la que se haya configurado). Sin esto la
   app arranca y falla al primer guardado.
6. El certificado, por *Enlaces* → *https*, y activar **Requerir SSL**.

El frontend compilado (`frontend/dist`) va como un sitio estático aparte, con
una regla de reescritura que mande todo a `index.html`.

---

## 5. Respaldos

La aplicación ya hace uno **al arrancar y cada 24 horas**, con `VACUUM INTO`
(que es la forma correcta con WAL: copiar el `.db` a mano mientras la app
escribe produce un archivo que abre sin quejarse pero al que le faltan las
últimas transacciones — el peor tipo de respaldo). Se guardan comprimidos, 30
días, y se ven en **Panel → Seguridad → Respaldos**.

**Eso no basta.** Un respaldo en el mismo disco que el original no protege de
que el disco se muera ni de un ransomware. Hay que sacarlos de la máquina:

```bash
# /etc/cron.daily/isel-backup-offsite
rsync -az /var/isel/backups/ respaldos@otra-maquina:/respaldos/isel/
```

o subirlos a un bucket (S3, Backblaze B2, Google Drive con `rclone`).

### Restaurar

```bash
sudo systemctl stop isel-api
cd /var/isel
gunzip -c backups/isel-2026-09-02_030000.db.gz > isel-restaurada.db
mv isel.db isel.db.rota && mv isel-restaurada.db isel.db
rm -f isel.db-wal isel.db-shm          # sobran: la copia ya está consolidada
sudo chown www-data:www-data isel.db
sudo systemctl start isel-api
```

> **Haz esta prueba una vez, antes de salir a producción.** Un respaldo que
> nunca se ha restaurado no es un respaldo, es una carpeta con archivos.

### Borrar solo los datos de prueba (lo habitual)

Deja el padron del Excel, el pensum y las cuentas del panel EXACTAMENTE como
estan, y barre lo que se genero probando: fichas de asignacion, aspirantes,
solicitudes de titulo, papeleria y los PDF subidos.

Desde `backend/UmesIsel.Api`:

```powershell
dotnet run -- limpiar-pruebas
```

Primero **enseña un recuento de lo que va a borrar** y de lo que conserva, y no
toca nada hasta que se escriba `SI` en mayusculas. Para saltarse la pregunta
(desde otro script), `dotnet run -- limpiar-pruebas --si`.

Detalles que conviene saber:

- **Solo corre en Development.** En cualquier otro entorno se niega y avisa. El
  comando borra la bitacora de seguridad y las fichas de todo el mundo: en un
  servidor de verdad eso no se hace nunca.
- **Borra tambien los alumnos que nacieron de una inscripcion de prueba** — los
  que entraron al padron con el boton «Agregar a BD» de un aspirante. Esos no
  vienen del Excel; los creo la prueba.
- **Quita la marca de «papeleria al dia»** de todo el padron: esa respuesta la
  dio alguien probando, no viene del Excel.
- Se puede ejecutar con el servidor encendido (SQLite en WAL lo permite), pero
  conviene apagarlo antes: si alguien esta guardando una ficha en ese momento,
  se la borras a medio camino.

### Borrar la base ENTERA y empezar de cero (opcion nuclear)

Para probar el flujo completo sin nada guardado: alumnos, fichas, aspirantes,
PDF subidos y bitacora de seguridad, todo fuera.

**Antes de empezar, apaga el backend** (Ctrl+C en la ventana donde corre
`dotnet run`). Con la aplicacion viva, SQLite tiene el archivo abierto: el
borrado falla, o deja sueltos los `-wal` / `-shm` y la base vuelve a nacer con
datos a medias.

PowerShell, desde la raiz del repositorio:

```powershell
# 1. La base y sus dos archivos de trabajo (WAL y shm)
Remove-Item backend\UmesIsel.Api\isel.db* -Force -ErrorAction SilentlyContinue

# 2. Los PDF que subieron los aspirantes y los alumnos
Remove-Item backend\UmesIsel.Api\App_Data\uploads -Recurse -Force -ErrorAction SilentlyContinue

# 3. Los respaldos automaticos (si no, te queda la base vieja al lado)
Remove-Item backend\UmesIsel.Api\App_Data\backups -Recurse -Force -ErrorAction SilentlyContinue
```

Y arrancar de nuevo:

```powershell
dotnet run --project backend\UmesIsel.Api
```

Al arrancar, la aplicacion crea la base vacia, aplica las migraciones y siembra
lo que hay en `backend/UmesIsel.Api/Data/Seed`: el padron de alumnos
(`students.seed.json`) y el catalogo de cursos. Es decir, «desde cero» deja el
padron sembrado, no una base literalmente vacia. Si tampoco lo quieres, saca
`students.seed.json` de esa carpeta antes de arrancar.

Dos cosas que **no** hace falta borrar:

- `App_Data/keys/token-signing.key` — la clave que firma las sesiones. Borrarla
  no rompe nada: se genera otra y caducan las sesiones abiertas.
- La cuenta del administrador. Se vuelve a crear con
  `AdminAccess__BootstrapUser` / `AdminAccess__BootstrapPassword`; si no hay
  variable de entorno, la aplicacion **genera una contrasena y la escribe en el
  log de arranque** — hay que leerla ahi la primera vez.

En Git Bash, los mismos tres borrados:

```bash
rm -f  backend/UmesIsel.Api/isel.db*
rm -rf backend/UmesIsel.Api/App_Data/uploads backend/UmesIsel.Api/App_Data/backups
```

---

## 6. Copiar la base actual al servidor

Los 170 alumnos y el pénsum ya están en tu `isel.db` local. Dos opciones:

- **Llevarte la base tal cual** (recomendado): párala, copia los tres archivos
  (`isel.db`, `isel.db-wal`, `isel.db-shm`) juntos, o mejor, genera un respaldo
  desde el panel y restáuralo en el servidor con §5.
- **Empezar de cero**: no copies nada. Al primer arranque, la aplicación
  siembra sola los 144 alumnos + 26 sacerdotes y el pénsum completo. Se pierde
  lo editado a mano desde el panel.

---

## 7. Lista de comprobación

Antes de anunciar la dirección:

- [ ] `https://` funciona y `http://` redirige solo.
- [ ] Entrar como alumno con un carné real y su correo institucional.
- [ ] Entrar al panel y **cambiar la contraseña del primer administrador**.
- [ ] Crear una cuenta nombrada para cada persona que administre; desactivar
      la genérica `admin` si ya no se usa.
- [ ] Guardar una ficha y comprobar que el PDF sale (verifica LibreOffice).
- [ ] Subir un PDF de prueba y descargarlo.
- [ ] Comprobar en **Seguridad → Respaldos** que hay al menos uno.
- [ ] Restaurar ese respaldo en una copia de prueba (§5).
- [ ] Abrir `https://<dominio>/swagger` → **debe dar 404**. Si carga, falta
      `ASPNETCORE_ENVIRONMENT=Production`.
- [ ] En **Seguridad → Bitácora**, ver que la columna "Desde" trae direcciones
      reales y no todas la del proxy. Si se repiten, falta
      `Hosting__BehindReverseProxy=true`.
- [ ] Comprobar que `App_Data/` **no** se sirve desde el navegador: pedir
      `https://<dominio>/App_Data/uploads/` debe dar 404.

---

## 8. Mantenimiento

| Cada cuánto | Qué |
|---|---|
| Semanal | Mirar **Seguridad → Bitácora**, filtrando por "Solo alertas". Una ráfaga de accesos fallidos desde la misma dirección es alguien probando. |
| Mensual | `dotnet list package --vulnerable --include-transitive` y `pnpm audit`. Si aparece algo, avísame. |
| Trimestral | Restaurar un respaldo en una copia de prueba. |
| Al cambiar de personal | Desactivar su cuenta en **Seguridad → Cuentas**. Desactivar, no borrar: así lo que hizo sigue teniendo nombre en la bitácora. |

### Si se pierde la contraseña de administrador

No hay recuperación por correo (no hay servidor de correo configurado). Con
acceso al servidor:

1. Entrar con otra cuenta de admin y usar **Contraseña → reiniciar**.
2. Si no queda ninguna: parar la app, borrar las filas de `AdminUsers` con
   `sqlite3 isel.db "DELETE FROM AdminUsers;"`, y volver a arrancar con
   `AdminAccess__BootstrapPassword` puesta. Se crea la cuenta de nuevo.

### Botón de pánico

Si se sospecha que un token se filtró: **borrar `App_Data/keys/token-signing.key`**
(o cambiar `Security__TokenSecret`) y reiniciar. Cierra la sesión de todo el
mundo al instante.
