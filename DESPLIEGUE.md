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
