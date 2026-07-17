# Etapa 1: build estático de Astro (sin adapter — todas las páginas son shells
# estáticos + islas React que hablan con el backend vía fetch, no hay SSR real).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: sirve el build estático y hace de reverse proxy a /api (mismo origen,
# necesario para que la cookie de sesión httpOnly viaje sin problemas de CORS).
# Caddy obtiene y renueva HTTPS automáticamente para el dominio configurado.
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
