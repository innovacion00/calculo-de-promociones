// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Frontend Astro + islas React. En dev, Vite hace proxy de /api hacia el backend
// Express (:3000) para que el navegador vea un solo origen: así la cookie httpOnly
// de sesión (rmd_session) viaja sin problemas de CORS/SameSite.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? 'http://localhost:3000';

export default defineConfig({
  integrations: [react()],
  server: { port: 4321 },
  vite: {
    // El repo raíz tiene su propia copia de React (app Next). Forzamos que el frontend
    // use SIEMPRE su propio React para evitar "jsxDEV is not a function" al hidratar.
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-dev-runtime', 'react/jsx-runtime'],
    },
    server: {
      proxy: {
        '/api': {
          target: BACKEND_ORIGIN,
          changeOrigin: true,
        },
      },
    },
  },
});
