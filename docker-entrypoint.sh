#!/bin/sh
set -e

# Arranque del contenedor.
#
# El problema que resuelve: los volúmenes persistentes (Fly.io, Docker, Railway)
# se montan sobre /data pertenciendo a root, y eso pisa cualquier permiso que se
# hubiera dejado puesto al construir la imagen. Si la aplicación corre como
# usuario sin privilegios, se encuentra con que no puede escribir su propia base
# de datos — y falla al primer guardado, no al arrancar, que es peor porque
# parece que todo está bien hasta que alguien intenta usarlo.
#
# Así que se arranca como root, se le da el volumen al usuario de la aplicación,
# y se BAJA de privilegios antes de ejecutar nada de .NET. La aplicación nunca
# corre como root.

if [ "$(id -u)" = "0" ]; then
    mkdir -p /data/backups
    chown -R app:app /data

    # `exec` reemplaza el proceso en vez de crear uno hijo: así la aplicación es
    # el PID 1 y recibe directamente la señal de apagado del sistema. Sin esto,
    # un despliegue mataría el contenedor sin dejar cerrar la base de datos
    # limpiamente.
    exec setpriv --reuid=app --regid=app --init-groups dotnet UmesIsel.Api.dll
fi

# Si la plataforma ya arrancó el contenedor como un usuario concreto (algunos
# hostings lo hacen), no hay nada que bajar: se ejecuta y ya.
exec dotnet UmesIsel.Api.dll
