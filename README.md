# Calculador de Precompra GEH Suites

Monolito modular para gestión de revenue management: backend Express y
frontend Astro + islas React, cada uno en su propia carpeta y con su propio
`package.json`. MongoDB (Atlas) es la base de datos compartida.

## Desarrollo local

```bash
cd backend && npm install && npm run dev    # Express en :3000
cd frontend && npm install && npm run dev   # Astro en :4321 (proxy /api → backend)
```

Variables de entorno en `.env` en la raíz del repo (ver `.env.local.example`).

## Despliegue (Docker)

```bash
cp .env.docker.example .env   # llenar con los valores reales
docker compose up -d --build
```

Requiere un dominio con DNS apuntando al servidor — el contenedor Caddy
obtiene y renueva el certificado HTTPS automáticamente. Para probar el stack
completo en localhost sin dominio/TLS:

```bash
DOMAIN=:80 FRONTEND_HTTP_PORT=8080 docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

## Estructura

- `backend/src/modules/<módulo>/` — router + controller Express por módulo.
- `backend/src/models/` — acceso a MongoDB.
- `frontend/src/pages/<módulo>.astro` — una página por módulo.
- `frontend/src/components/<módulo>/` — islas React del módulo.
- `scripts/` — utilidades de mantenimiento de Mongo (seed, migraciones puntuales).
