#!/bin/sh
set -e

# Aplica as migrations pendentes antes de subir a API. `migrate deploy` só executa migrations já
# versionadas — nunca gera nem apaga nada — então é seguro rodar a cada start do container.
echo "[entrypoint] aplicando migrations..."
node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma

echo "[entrypoint] iniciando API..."
exec "$@"
