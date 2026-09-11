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

Y la segunda: si deja **instalar LibreOffice**, que es lo que convierte las
fichas a PDF. Sin él la aplicación arranca y funciona, pero ningún documento se
puede imprimir.

| Opción | ¿Sirve? | Notas |
|---|---|---|
| **VPS Linux** (Hetzner, DigitalOcean, Linode, Oracle Cloud) | ✅ Sí | La más recomendable. Disco propio, control total, 0-12 USD/mes. |
| **Servidor Windows de la universidad + IIS** | ✅ Sí | Perfecto si ya lo tienen. Ver §4B. |
| **Docker con volumen persistente** (Fly.io, Railway de paga) | ✅ Sí | Hay que montar `/data` como volumen. Sin volumen, se pierde todo. |
| **Azure App Service / AWS Elastic Beanstalk** | ⚠️ Con cuidado | Solo con disco persistente y **una sola instancia**. Si escala a dos, SQLite se corrompe. |
| **Planes gratuitos de Render / Koyeb / Railway** | ⚠️ Demo | El disco NO persiste y el servicio se duerme: **la base de datos se pierde**. Solo para enseñar la página un rato. |
| **Vercel / Netlify / Cloudflare Pages** | ❌ backend, ✅ frontend | No corren procesos con disco. El *frontend* sí va perfecto ahí. |
| **Hosting compartido tipo cPanel / InfinityFree** | ❌ No | Es PHP+MySQL. No corre .NET ni deja instalar LibreOffice. |

En los dos caminos de abajo el montaje es el mismo dibujo: **el sitio por un
lado, la API por otro**, hablando por HTTPS.

```
   Alumno  ──►  el sitio (React compilado, archivos estáticos)
                             │
                             │  llamadas a la API
                             ▼
                la API (.NET + SQLite + LibreOffice, en Docker sobre un VPS)
```

Lo único que hay que recordar es poner la dirección del sitio en
`Cors__Origins__0`, o el navegador bloqueará todas las llamadas y **ningún
formulario guardará**.

> **Nota sobre Fly.io:** la versión anterior de esta guía lo recomendaba como
> opción gratuita. **Ya no lo es**: Fly.io cobra desde el primer mes (mínimo
> ~5 USD). Sigue funcionando bien y el `Dockerfile` del repositorio corre tal
> cual, pero entra en la ruta de paga, no en la gratis.

### ¿Aguanta este proyecto un día de inscripciones?

Sí. Para 170 alumnos, con decenas guardando su ficha la misma tarde, SQLite en
modo WAL va sobrado — es el mismo motor que llevan los aviones y los teléfonos.
Los tres fallos que de verdad tumban un montaje así ya están cerrados en el
código:

- **Ruta relativa de la base** → resuelta contra la carpeta de la aplicación
  (`Program.cs`). Sin esto, el servidor crea una base vacía en otro sitio y
  parece que "se borraron todos los alumnos".
- **Bloqueos de escritura** → `journal_mode=WAL` y 30 s de espera. Sin esto, dos
  personas guardando a la vez producen *"database is locked"*.
- **Avalancha de LibreOffice** → generar un PDF levanta un proceso de unos
  200 MB. Hay dos frenos: uno por persona
  (`RateLimitPolicies.Pesado`, 2 a la vez) y un techo global de 3 conversiones
  simultáneas en `FichaPdfBuilder`. Un pico se convierte en cola, no en una
  máquina sin memoria.

El límite real de SQLite aquí no es el número de alumnos: es **tener más de una
instancia de la aplicación escribiendo el mismo archivo**. No lo hagan.

---

## 1-A. Ruta GRATIS — para que la prueben

Dos piezas, las dos gratis de verdad y sin fecha de caducidad:

| Pieza | Dónde | Por qué |
|---|---|---|
| Sitio | **Cloudflare Pages** → `umes-isel.pages.dev` | Gratis sin trampa, HTTPS automático, no duerme, no corta por tráfico, no pide tarjeta. |
| API | **Oracle Cloud Always Free** → una máquina propia | Lo único gratis *para siempre* con disco propio. Hasta 4 vCPU / 24 GB de RAM en ARM. Pide tarjeta solo para verificar identidad; no cobra. |

> **¿Solo quieres enseñarla media hora?** Sáltate Oracle y sube el backend a
> Render con el `Dockerfile`. Tarda cinco minutos, pero **el servicio se duerme
> y la base de datos se borra en cada despliegue**. Para eso y nada más.

### Paso 1 — la máquina en Oracle Cloud

1. Crear la cuenta en <https://cloud.oracle.com> (elegir una región cercana,
   por ejemplo São Paulo o Ashburn) y verificar con tarjeta.
2. **Compute → Instances → Create Instance.**
3. En *Image and shape*: imagen **Ubuntu 22.04**, y en *Shape* elegir
   **Ampere (VM.Standard.A1.Flex)** con **2 OCPU y 12 GB de memoria** — está
   dentro del tramo Always Free.
4. Guardar la **clave SSH** que ofrece descargar. Sin ella no se entra nunca más.
5. En *Networking*, dejar que cree la red por defecto y **anotar la IP pública**.
6. Ya creada: **Networking → Virtual Cloud Networks → (la red) → Security Lists
   → Default** → *Add Ingress Rules*, y abrir los puertos **80** y **443**
   (Source `0.0.0.0/0`, protocolo TCP). Sin esto la máquina existe pero nadie la
   alcanza — es el tropiezo clásico de Oracle.

### Paso 2 — instalar la API en esa máquina

Entrar por SSH (desde PowerShell, en la carpeta donde guardaste la clave):

```powershell
ssh -i .\clave.key ubuntu@<IP-PUBLICA>
```

Y una vez dentro:

```bash
# Oracle trae el cortafuegos cerrado por dentro también
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80  -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Docker
sudo apt update && sudo apt install -y docker.io git
sudo usermod -aG docker ubuntu && newgrp docker

# El proyecto
git clone <la-url-de-tu-repositorio> isel && cd isel
docker build -t isel-api .

# El disco donde vive la base de datos, FUERA del contenedor
docker volume create isel_data
```

Arrancar la aplicación (cambiando los valores de ejemplo):

```bash
docker run -d --name isel-api --restart always \
  -p 8080:8080 \
  -v isel_data:/data \
  -e Security__TokenSecret="$(openssl rand -base64 48)" \
  -e AdminAccess__BootstrapUser="tu.usuario" \
  -e AdminAccess__BootstrapPassword="una contraseña larga que elijas tú" \
  -e Cors__Origins__0="https://umes-isel.pages.dev" \
  -e Hosting__BehindReverseProxy=true \
  isel-api
```

Comprobar que arrancó y **anotar la contraseña del administrador**:

```bash
docker logs isel-api | grep -A6 "CUENTA DE ADMINISTRADOR"
curl -i http://localhost:8080/api/programs      # tiene que dar 200
```

### Paso 3 — HTTPS en la API

El sitio va por `https://`, así que la API también tiene que ir por `https://` o
el navegador bloqueará las llamadas por *Mixed Content*. Hace falta un nombre;
la IP pelada no sirve para un certificado. Si aún no hay dominio, sirve un
subdominio gratis de [DuckDNS](https://duckdns.org) (`isel-api.duckdns.org`)
apuntando a esa IP.

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/isel
```

Pegar dentro:

```nginx
server {
    listen 80;
    server_name isel-api.duckdns.org;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        proxy_read_timeout 120s;
        client_max_body_size 12M;
    }
}
```

Y activarlo:

```bash
sudo ln -sf /etc/nginx/sites-available/isel /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d isel-api.duckdns.org
```

Como ahora Nginx está delante, conviene relanzar el contenedor con
`-p 127.0.0.1:8080:8080` en vez de `-p 8080:8080`, para que la API solo se
alcance desde dentro de la máquina.

### Paso 4 — el sitio en Cloudflare Pages

En tu computadora:

```powershell
cd frontend
copy .env.production.example .env.production
```

Editar `.env.production` y poner la dirección de la API del paso 3:

```
VITE_API_URL=https://isel-api.duckdns.org
```

```powershell
pnpm install
pnpm run build          # deja el sitio compilado en frontend\dist
```

En el navegador:

1. Entrar a <https://dash.cloudflare.com> y crear la cuenta (gratis, sin tarjeta).
2. **Workers & Pages → Create → pestaña Pages → Upload assets.**
3. Nombre del proyecto: `umes-isel` (ese nombre decide la dirección,
   `umes-isel.pages.dev`).
4. Arrastrar **el contenido de `frontend\dist`** — los archivos sueltos
   (`index.html`, `assets/`, `images/`), **no** la carpeta `dist`.
5. **Deploy.** En menos de un minuto está en línea con HTTPS.

Cloudflare Pages ya sirve bien una aplicación de una sola página, así que
recargar en `/portal/admin` funciona sin configurar nada más.

**Para publicar cambios**: `pnpm run build` otra vez y, en el mismo proyecto,
**Create new deployment** → subir el `dist` nuevo.

### Paso 5 — enlazarlos y comprobar

Si la dirección que quedó en Pages no es la que pusiste en el paso 2, hay que
relanzar el contenedor con el `Cors__Origins__0` correcto:

```bash
docker rm -f isel-api      # y repetir el `docker run` con el dominio bueno
```

Comprobación, en este orden:

1. Abrir `https://umes-isel.pages.dev` y entrar al portal como alumno.
2. Guardar una ficha y **volver a abrirla**: si los datos siguen ahí, la base
   está escribiendo en el volumen.
3. Descargar el PDF de esa ficha: si sale, LibreOffice quedó bien instalado.
4. Entrar al panel con el usuario administrador del paso 2.
5. `docker rm -f isel-api` y volver a lanzarlo. Si la ficha **sigue existiendo
   después de eso**, el volumen está bien montado. Esta es la prueba que de
   verdad importa.

Si el sitio carga pero ningún formulario guarda, abrir la consola con F12:

- `CORS policy` → el dominio de Pages no coincide con `Cors__Origins__0`.
- `Mixed Content` → `VITE_API_URL` quedó en `http://`; tiene que ser `https://`.
- `Failed to fetch` → el contenedor está caído: `docker logs isel-api`.

---

## 1-B. Ruta DE PAGA — para producción

Recomendación: **un VPS de Hetzner con dominio propio**, no una plataforma
gestionada. Sale más barato, es más máquina y no impone límites raros.

| Opción | Precio/mes | Veredicto |
|---|---|---|
| **Hetzner CX22** (2 vCPU, 4 GB RAM, 40 GB SSD) | **~4 €** | ✅ **La recomendada.** Sobra para este proyecto. Snapshots por ~1 € más. |
| DigitalOcean Droplet 2 GB | ~12 USD | Igual de fiable, el triple de caro por menos máquina. |
| Fly.io (1 GB + volumen) | ~10 USD | Funciona y el `Dockerfile` corre tal cual, pero pagas más por menos. |
| Azure App Service | 13+ USD | **Peligroso**: si escala a dos instancias, SQLite se corrompe. |

**Coste total realista: unos 55 USD al año** — VPS, más el dominio (10-12
USD/año en Cloudflare o Namecheap), más un snapshot semanal.

La diferencia importante con la ruta gratis: aquí va **todo bajo un solo
dominio**, el sitio en `/` y la API en `/api/`. Eso hace que **desaparezca el
problema de CORS**, que es la causa número uno de "la página carga pero nada
guarda".

### Paso 1 — el servidor y el dominio

1. Crear el servidor en <https://console.hetzner.cloud>: **CX22**, imagen
   **Ubuntu 22.04**, y pegar tu clave SSH. Anotar la IP.
2. Comprar el dominio (por ejemplo `isel-umes.org`) y, en su DNS, crear:

```
Tipo   Nombre   Valor              TTL
A      @        <IP del servidor>  3600
A      www      <IP del servidor>  3600
```

Esperar a que propague — `nslookup isel-umes.org` desde tu máquina tiene que
devolver esa IP antes de seguir, o Certbot fallará en el paso 4.

### Paso 2 — preparar la máquina

```bash
ssh root@<IP>

apt update && apt upgrade -y
apt install -y docker.io nginx certbot python3-certbot-nginx ufw

# Colchón de memoria para los picos de LibreOffice
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Cortafuegos: solo SSH y web
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

### Paso 3 — la API

```bash
git clone <la-url-de-tu-repositorio> /opt/isel && cd /opt/isel
docker build -t isel-api .
docker volume create isel_data

docker run -d --name isel-api --restart always \
  -p 127.0.0.1:8080:8080 \
  -v isel_data:/data \
  -e Security__TokenSecret="$(openssl rand -base64 48)" \
  -e AdminAccess__BootstrapUser="tu.usuario" \
  -e AdminAccess__BootstrapPassword="una contraseña larga que elijas tú" \
  -e Cors__Origins__0="https://isel-umes.org" \
  -e Hosting__BehindReverseProxy=true \
  isel-api

docker logs isel-api | grep -A6 "CUENTA DE ADMINISTRADOR"   # anota la contraseña
```

`-p 127.0.0.1:8080:8080` (y no `-p 8080:8080`) es a propósito: así la API
**solo** se alcanza desde dentro de la máquina, a través de Nginx. Publicada al
mundo, cualquiera podría saltarse el HTTPS hablándole directo por el 8080.

### Paso 4 — el sitio y Nginx

Compilar el frontend en tu computadora:

```powershell
cd frontend
echo VITE_API_URL=https://isel-umes.org > .env.production
pnpm install ; pnpm run build
```

Subirlo al servidor:

```powershell
ssh root@<IP> "mkdir -p /var/www/isel-web"
scp -r frontend\dist\* root@<IP>:/var/www/isel-web/
```

Y en el servidor, `nano /etc/nginx/sites-available/isel`:

```nginx
server {
    listen 80;
    server_name isel-umes.org www.isel-umes.org;

    root /var/www/isel-web;
    index index.html;

    # React Router: cualquier ruta desconocida la resuelve el navegador
    location / {
        try_files $uri $uri/ /index.html;
    }

    # La API, en el MISMO dominio — por esto aquí no hay CORS
    location /api/ {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Los PDF combinados de "Imprimir todas" pueden tardar
        proxy_read_timeout 120s;
        client_max_body_size 12M;
    }
}
```

```bash
ln -sf /etc/nginx/sites-available/isel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Certificado gratis con renovación automática. Certbot añade solo el bloque
# de HTTPS y la redirección desde HTTP; no hay que escribirlos a mano.
certbot --nginx -d isel-umes.org -d www.isel-umes.org
```

### Paso 5 — llevarse los datos que ya existen

Los 170 alumnos y el pénsum ya están en tu `isel.db` local. Ver §6: o se copia
la base tal cual, o se deja que la aplicación siembre el padrón sola al primer
arranque.

### Paso 6 — respaldos fuera de la máquina

La aplicación ya respalda sola cada 24 h dentro de `/data/backups`, pero eso
está en el mismo disco que el original. Hay que sacarlos de ahí (ver §5):

```bash
# /etc/cron.daily/isel-backup-offsite
docker run --rm -v isel_data:/data -v /root/respaldos:/salida alpine \
  sh -c 'cp /data/backups/*.gz /salida/'
rclone sync /root/respaldos b2:isel-respaldos     # o rsync a otra máquina
```

### Paso 7 — publicar cambios más adelante

```bash
cd /opt/isel && git pull
docker build -t isel-api . && docker rm -f isel-api
# y volver a lanzar el mismo `docker run` del paso 3
```

El volumen `isel_data` no se toca, así que la base de datos sobrevive al
redespliegue. Para el frontend, `pnpm run build` y `scp` otra vez.

Terminado esto, seguir con la **§7, lista de comprobación**, antes de anunciar
la dirección a los alumnos.

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
