# Imagen del backend (ASP.NET Core 8 + SQLite + LibreOffice).
#
# Existe porque el backend NO puede correr en un hosting compartido de PHP como
# InfinityFree: necesita un proceso .NET vivo, un disco donde escribir la base y
# el binario de LibreOffice para convertir las fichas a PDF. Con este Dockerfile
# el mismo contenedor sirve para Fly.io, Render, Railway, Koyeb o cualquier VPS
# con Docker — ver DESPLIEGUE.md.

# ---------------------------------------------------------------- compilación
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Primero solo el .csproj: mientras no cambien las dependencias, Docker reutiliza
# la capa del restore y compilar tarda segundos en vez de minutos.
COPY backend/UmesIsel.Api/UmesIsel.Api.csproj backend/UmesIsel.Api/
RUN dotnet restore backend/UmesIsel.Api/UmesIsel.Api.csproj

COPY backend/ backend/
RUN dotnet publish backend/UmesIsel.Api/UmesIsel.Api.csproj \
        -c Release -o /app/publish /p:UseAppHost=false

# ------------------------------------------------------------------ ejecución
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

# LibreOffice es lo que convierte la ficha .xlsx y los .docx a PDF. Se instalan
# solo los dos módulos que se usan (calc para la ficha, writer para las cartas y
# la solicitud de título) y las fuentes: sin ellas LibreOffice sustituye la
# tipografía del formato oficial y el documento sale descuadrado.
#
# Todo va en UNA capa con la limpieza incluida: en pasos separados, los archivos
# borrados seguirían pesando dentro de la imagen.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libreoffice-calc \
        libreoffice-writer \
        fonts-dejavu \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .

# Carpeta de datos: base SQLite, documentos subidos, respaldos y la clave que
# firma las sesiones. TIENE que montarse como volumen persistente; si no, cada
# despliegue empieza con la base vacía y todos los alumnos "desaparecen".
RUN mkdir -p /data
VOLUME ["/data"]

# Cada variable en su propia línea: Docker NO admite comentarios dentro de una
# instrucción partida con barras, y meter uno rompe la construcción entera.
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080
ENV ConnectionStrings__IselDb="Data Source=/data/isel.db"
ENV Backups__Directory="/data/backups"
# LibreOffice necesita un HOME donde escribir su perfil. Sin esto la primera
# conversión falla y el PDF no sale nunca.
ENV HOME=/tmp

EXPOSE 8080

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# El contenedor arranca como root SOLO para poder dar permisos sobre el volumen
# recién montado; el script baja a un usuario sin privilegios antes de ejecutar
# la aplicación. Ver docker-entrypoint.sh.
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
