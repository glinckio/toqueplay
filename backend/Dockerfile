# Contexto de build = a pasta backend/. No EasyPanel, use "Caminho de Build" = /backend.
FROM node:22-alpine AS base
WORKDIR /app
# O Prisma precisa do OpenSSL para escolher a engine certa. Sem ele a detecção falha, o CLI tenta
# baixar a engine em tempo de execução e quebra — inclusive na hora de aplicar as migrations.
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
# `npm ci` respeita o lockfile e falha se ele estiver fora de sincronia — o que é o comportamento
# desejado num build de deploy. Inclui devDependencies porque o build precisa do Nest CLI.
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
# Alpine não traz o banco de fusos: sem tzdata, TZ=America/Sao_Paulo cairia silenciosamente em UTC.
RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo
RUN addgroup -S app && adduser -S app -G app

# node_modules completo de propósito: o entrypoint usa o CLI do Prisma para as migrations e o
# `prisma db seed` usa ts-node — ambos são devDependencies.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER app
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
