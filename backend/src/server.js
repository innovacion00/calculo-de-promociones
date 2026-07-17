// Punto de entrada del backend Express (monolito modular).
// Monta middleware global, los routers por módulo y el manejo de errores.
// Los módulos se van añadiendo por fases (auth, financial, ...); hoy solo /api/health.

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { env } from './config/env.js';
import './config/db.js'; // dispara la conexión a Mongo al arrancar
import { attachSession } from './middleware/session.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { financialRouter } from './modules/financial/financial.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { hotelesRouter } from './modules/hoteles/hoteles.routes.js';
import { monitoreoRouter } from './modules/monitoreo/monitoreo.routes.js';
import { otbRouter } from './modules/otb/otb.routes.js';
import { styRouter } from './modules/sty/sty.routes.js';
import { simulatorRouter } from './modules/simulator/simulator.routes.js';

const app = express();

// --- Middleware global ---
// CORS con credenciales: solo necesario si el frontend llega desde otro origen
// (dominios separados). Con el proxy dev de Astro / reverse proxy en prod, mismo
// origen y esto es inofensivo.
app.use(cors({ origin: env.frontendOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(attachSession);

// --- Routers por módulo (bajo /api) ---
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/financial', financialRouter);
app.use('/api/users', usersRouter);
app.use('/api/hoteles', hotelesRouter);
app.use('/api/status', monitoreoRouter);
app.use('/api/otb', otbRouter);
app.use('/api/sty', styRouter);
app.use('/api', simulatorRouter);

// --- Cierre ---
app.use('/api', notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[server] ▶ Express escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
});
