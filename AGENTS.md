# Monolito modular: Express + Astro

Este repo ya no es la app Next.js original — fue migrada por completo a dos
servicios independientes (JavaScript + JSDoc, sin TypeScript):

- `backend/` — Express (ESM). Todo bajo `/api/*`. Un módulo por dominio en
  `backend/src/modules/*`. Modelos Mongo en `backend/src/models/*`.
- `frontend/` — Astro + islas React (`.jsx`). Una página Astro por módulo en
  `frontend/src/pages/*`, componentes en `frontend/src/components/<módulo>/`.

MongoDB (Atlas) es la misma base de datos de siempre — no cambió.

## Desarrollo local

```bash
cd backend && npm run dev    # Express en :3000
cd frontend && npm run dev   # Astro en :4321 (proxy /api → backend)
```

## Despliegue

Docker Compose (`docker-compose.yml` en la raíz): un contenedor Express y un
contenedor Caddy (sirve el build estático de Astro + reverse-proxy de `/api`
al backend, mismo origen para que la cookie de sesión funcione, HTTPS
automático). `docker-compose.local.yml` es un overlay solo para probar en
localhost sin dominio/TLS — no usar en el droplet real. Ver
`.env.docker.example` para las variables requeridas.

## Convención de módulos

Cada módulo migrado sigue el mismo patrón: router Express bajo
`/api/<módulo>` + página Astro + componentes React que llaman a la API vía
`frontend/src/lib/api.js`. Al añadir o tocar un módulo, revisa primero cómo
está resuelto uno ya migrado (p. ej. `otb` u `otb`/`sty`, que son gemelos)
antes de introducir un patrón nuevo.
