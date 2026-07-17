// Carga y validación temprana de variables de entorno.
// El proceso arranca con `node --env-file=../.env`, así que las variables ya están
// en process.env cuando se importa este módulo. Aquí solo validamos y exponemos.

/** Variables mínimas sin las cuales el servidor no debe arrancar. */
const REQUIRED = ['MONGODB_URI'];

/** @type {string[]} */
const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`[env] ❌ Faltan variables de entorno requeridas: ${missing.join(', ')}`);
  process.exit(1);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongoUri: /** @type {string} */ (process.env.MONGODB_URI),
  sessionSecret: process.env.SESSION_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? 'dev-session-fallback-key-32chars!!',
  // Origen permitido para el frontend Astro (solo relevante si se usa CORS directo,
  // no cuando se sirve tras un reverse proxy / dev proxy de Vite).
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:4321',
};

export const isProd = env.nodeEnv === 'production';
