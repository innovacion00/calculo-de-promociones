// Health check: confirma que el proceso vive y que Mongo responde.

import { Router } from 'express';
import { getDb } from '../../config/db.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ ok: true, status: 'healthy', db: db.databaseName, time: new Date().toISOString() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(503).json({ ok: false, status: 'unhealthy', error: message });
  }
});
