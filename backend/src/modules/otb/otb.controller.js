// Controladores de análisis OTB. Port de src/app/api/otb/analyses/*.
// El cálculo (parseo Excel + comparativa) vive en el frontend; aquí solo se persiste/lee.

import { createOtbAnalysis, listOtbAnalyses, getOtbAnalysis, deleteOtbAnalysis } from '../../models/otbAnalysis.js';
import { getHotelByNombre } from '../../models/hotel.js';

/**
 * GET /api/otb/analyses?hotelId=<nombre>&limit=50
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function listAnalyses(req, res) {
  // @ts-expect-error — session la adjunta attachSession
  const session = req.session;
  if (!session.permissions.includes('canEditOtb') && !session.permissions.includes('canViewDashboard')) {
    res.status(403).json({ ok: false, error: 'Sin permisos.' });
    return;
  }

  const hotelNombreParam = req.query.hotelId ? String(req.query.hotelId) : undefined;
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);

  // Usuarios no-master solo ven análisis de sus hoteles.
  const effectiveNombre = session.role === 'master_admin'
    ? hotelNombreParam
    : (hotelNombreParam ?? session.hotelAccess[0]);

  let hotelObjectId;
  if (effectiveNombre) {
    const hotel = await getHotelByNombre(effectiveNombre);
    hotelObjectId = hotel?._id?.toString();
  }

  const analyses = await listOtbAnalyses(hotelObjectId, effectiveNombre, limit);
  res.json({ ok: true, analyses });
}

/**
 * POST /api/otb/analyses
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function createAnalysis(req, res) {
  // @ts-expect-error — session la adjunta attachSession
  const session = req.session;
  if (!session.permissions.includes('canEditOtb') && !session.permissions.includes('canUploadOtbFiles')) {
    res.status(403).json({ ok: false, error: 'Sin permisos para guardar análisis OTB.' });
    return;
  }

  const body = req.body ?? {};
  const { hotelId: hotelNombreBody, month, cutoffBefore, cutoffAfter, mode, sourceBefore, sourceAfter, metrics, weeklyMetrics, comparison, date } = body;

  if (!hotelNombreBody) { res.status(400).json({ ok: false, error: 'hotelId es requerido.' }); return; }
  if (!month) { res.status(400).json({ ok: false, error: 'month es requerido.' }); return; }
  if (!metrics) { res.status(400).json({ ok: false, error: 'metrics es requerido.' }); return; }

  const hotelDoc = await getHotelByNombre(hotelNombreBody);
  const resolvedHotelId = hotelDoc?._id?.toString() ?? hotelNombreBody;

  const now = new Date().toISOString();
  const analysis = await createOtbAnalysis({
    id: `otb_${Date.now()}`,
    hotelId: resolvedHotelId,
    hotelNombre: hotelNombreBody,
    createdBy: session.userId,
    createdAt: now,
    month,
    cutoffBefore: cutoffBefore ?? null,
    cutoffAfter: cutoffAfter ?? null,
    mode: mode ?? 'exactDate',
    sourceBefore: sourceBefore ?? 'unknown',
    sourceAfter: sourceAfter ?? 'unknown',
    metrics,
    weeklyMetrics: weeklyMetrics ?? null,
    comparison: comparison ?? [],
    date: date ?? now.slice(0, 10),
  });
  res.status(201).json({ ok: true, analysis });
}

/**
 * GET /api/otb/analyses/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function getAnalysis(req, res) {
  // @ts-expect-error — session la adjunta attachSession
  const session = req.session;
  if (!session.permissions.includes('canEditOtb') && !session.permissions.includes('canViewDashboard')) {
    res.status(403).json({ ok: false, error: 'Sin permisos.' });
    return;
  }
  const analysis = await getOtbAnalysis(req.params.id);
  if (!analysis) { res.status(404).json({ ok: false, error: 'Análisis no encontrado.' }); return; }
  res.json({ ok: true, analysis });
}

/**
 * DELETE /api/otb/analyses/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function removeAnalysis(req, res) {
  // @ts-expect-error — session la adjunta attachSession
  const session = req.session;
  if (!session.permissions.includes('canEditOtb') && !session.permissions.includes('canDeleteNotes')) {
    res.status(403).json({ ok: false, error: 'Sin permisos para eliminar.' });
    return;
  }
  const deleted = await deleteOtbAnalysis(req.params.id);
  if (!deleted) { res.status(404).json({ ok: false, error: 'No encontrado.' }); return; }
  res.json({ ok: true });
}
