// Router de hoteles. Se monta en /api/hoteles. Devuelve nombres para asignar acceso.

import { Router } from 'express';
import { requireAuth } from '../../middleware/session.js';
import { listHoteles } from '../../models/hotel.js';

export const hotelesRouter = Router();

hotelesRouter.get('/', requireAuth, async (_req, res) => {
  const hoteles = await listHoteles();
  res.json({ ok: true, nombres: hoteles.map((h) => h.nombre) });
});
