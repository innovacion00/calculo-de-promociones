// Controlador de configuración del Simulador de Tarifas. Port de src/app/api/rate-config/route.ts.
// Un único documento por hotel (colección `rate_configs`), compartida con la app anterior.

import { getRateConfig, upsertRateConfig } from '../../models/rateConfig.js';
import { getHotelByNombre } from '../../models/hotel.js';

/**
 * GET /api/rate-config?hotelId=<nombre>
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function getConfig(req, res) {
  // @ts-expect-error — session la adjunta attachSession
  const session = req.session;
  const hotelNombreParam = req.query.hotelId ? String(req.query.hotelId) : undefined;
  if (!hotelNombreParam) { res.status(400).json({ ok: false, error: 'hotelId es requerido.' }); return; }

  const canAccess = session.role === 'master_admin'
    || session.hotelAccess.length === 0
    || session.hotelAccess.includes(hotelNombreParam);
  if (!canAccess) { res.status(403).json({ ok: false, error: 'Sin acceso a este hotel.' }); return; }

  const hotelDoc = await getHotelByNombre(hotelNombreParam);
  const objectId = hotelDoc?._id?.toString();

  let config = objectId ? await getRateConfig(objectId) : null;
  if (!config) config = await getRateConfig(hotelNombreParam); // legacy: hotelId era el nombre

  res.json({ ok: true, config });
}

/**
 * POST /api/rate-config — upsert de la config de un hotel.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function saveConfig(req, res) {
  // @ts-expect-error — session la adjunta attachSession
  const session = req.session;
  if (!session.permissions.includes('canEditRateSimulator')) {
    res.status(403).json({ ok: false, error: 'Sin permisos para editar el simulador.' });
    return;
  }

  const body = req.body ?? {};
  const {
    hotelId: hotelNombreBody, rawBaseInputs, rawPlanPcts, rawPaisPcts, promoVals,
    titleOverrides, labelOverrides, extraSections, deletedSectionIds, channelOverrides,
    sectionOrder, sectionRows,
  } = body;

  if (!hotelNombreBody) { res.status(400).json({ ok: false, error: 'hotelId es requerido.' }); return; }

  const canAccess = session.role === 'master_admin'
    || session.hotelAccess.length === 0
    || session.hotelAccess.includes(hotelNombreBody);
  if (!canAccess) { res.status(403).json({ ok: false, error: 'Sin acceso a este hotel.' }); return; }

  const hotelDoc = await getHotelByNombre(hotelNombreBody);
  const resolvedHotelId = hotelDoc?._id?.toString() ?? hotelNombreBody;

  await upsertRateConfig({
    hotelId: resolvedHotelId,
    hotelNombre: hotelNombreBody,
    updatedAt: new Date().toISOString(),
    updatedBy: session.userId,
    rawBaseInputs: rawBaseInputs ?? {},
    rawPlanPcts: rawPlanPcts ?? {},
    rawPaisPcts: rawPaisPcts ?? {},
    promoVals: promoVals ?? {},
    titleOverrides: titleOverrides ?? {},
    labelOverrides: labelOverrides ?? {},
    extraSections: extraSections ?? {},
    deletedSectionIds: deletedSectionIds ?? {},
    channelOverrides: channelOverrides ?? {},
    sectionOrder: sectionOrder ?? {},
    sectionRows: sectionRows ?? {},
  });
  res.json({ ok: true });
}
