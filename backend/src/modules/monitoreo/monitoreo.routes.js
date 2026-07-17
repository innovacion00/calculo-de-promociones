// Router de Monitoreo. Se monta en /api/status.

import { Router } from 'express';
import { requireAuth } from '../../middleware/session.js';
import { getUsersStatus, getPaused } from './monitoreo.controller.js';

export const monitoreoRouter = Router();

monitoreoRouter.get('/users-status', requireAuth, getUsersStatus);
monitoreoRouter.get('/paused', requireAuth, getPaused);
