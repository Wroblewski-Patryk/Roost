FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY public ./public
COPY web ./web
COPY vite.config.mjs tailwind.config.mjs ./
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ARG COMPANYCORE_BUILD_COMMIT=unknown
ARG COMPANYCORE_BUILD_IMAGE=unknown
ENV NODE_ENV=production
ENV COMPANYCORE_BUILD_COMMIT=$COMPANYCORE_BUILD_COMMIT
ENV COMPANYCORE_BUILD_IMAGE=$COMPANYCORE_BUILD_IMAGE
RUN apk add --no-cache openssl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
COPY scripts ./scripts
COPY package*.json ./
EXPOSE 3000
CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm run seed && node dist/server.js"]
