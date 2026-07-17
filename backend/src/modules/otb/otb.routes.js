// Router de análisis OTB. Se monta en /api/otb.

import { Router } from 'express';
import { requireAuth } from '../../middleware/session.js';
import { listAnalyses, createAnalysis, getAnalysis, removeAnalysis } from './otb.controller.js';

export const otbRouter = Router();

otbRouter.get('/analyses', requireAuth, listAnalyses);
otbRouter.post('/analyses', requireAuth, createAnalysis);
otbRouter.get('/analyses/:id', requireAuth, getAnalysis);
otbRouter.delete('/analyses/:id', requireAuth, removeAnalysis);
