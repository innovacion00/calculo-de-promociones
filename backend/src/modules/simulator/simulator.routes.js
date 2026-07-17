// Router de configuración del Simulador de Tarifas. Se monta en /api (path /api/rate-config,
// igual que la app anterior, para compartir la misma colección Mongo sin fricción).

import { Router } from 'express';
import { requireAuth } from '../../middleware/session.js';
import { getConfig, saveConfig } from './simulator.controller.js';

export const simulatorRouter = Router();

simulatorRouter.get('/rate-config', requireAuth, getConfig);
simulatorRouter.post('/rate-config', requireAuth, saveConfig);
