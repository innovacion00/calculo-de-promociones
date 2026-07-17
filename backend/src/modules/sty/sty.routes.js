// Router de análisis STY. Se monta en /api/sty. Gemelo de otb.routes.js.

import { Router } from 'express';
import { requireAuth } from '../../middleware/session.js';
import { listAnalyses, createAnalysis, getAnalysis, removeAnalysis } from './sty.controller.js';

export const styRouter = Router();

styRouter.get('/analyses', requireAuth, listAnalyses);
styRouter.post('/analyses', requireAuth, createAnalysis);
styRouter.get('/analyses/:id', requireAuth, getAnalysis);
styRouter.delete('/analyses/:id', requireAuth, removeAnalysis);
