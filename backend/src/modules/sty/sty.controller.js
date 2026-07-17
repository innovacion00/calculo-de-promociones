// Controladores de análisis STY. Gemelo de otb.controller.js — misma lógica de permisos,
// colección separada (sty_analyses). El cálculo (parseo Excel + comparativa) vive en el frontend.

import { createStyAnalysis, listStyAnalyses, getStyAnalysis, deleteStyAnalysis } from '../../models/styAnalysis.js';
import { getHotelByNombre } from '../../models/hotel.js';

/**
 * GET /api/sty/analyses?hotelId=<nombre>&limit=50
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

  const effectiveNombre = session.role === 'master_admin'
    ? hotelNombreParam
    : (hotelNombreParam ?? session.hotelAccess[0]);

  let hotelObjectId;
  if (effectiveNombre) {
    const hotel = await getHotelByNombre(effectiveNombre);
    hotelObjectId = hotel?._id?.toString();
  }

  const analyses = await listStyAnalyses(hotelObjectId, effectiveNombre, limit);
  res.json({ ok: true, analyses });
}

/**
 * POST /api/sty/analyses
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function createAnalysis(req, res) {
  // @ts-expect-error — session la adjunta attachSession
  const session = req.session;
  if (!session.permissions.includes('canEditOtb') && !session.permissions.includes('canUploadOtbFiles')) {
    res.status(403).json({ ok: false, error: 'Sin permisos para guardar análisis STY.' });
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
  const analysis = await createStyAnalysis({
    id: `sty_${Date.now()}`,
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
 * GET /api/sty/analyses/:id
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
  const analysis = await getStyAnalysis(req.params.id);
  if (!analysis) { res.status(404).json({ ok: false, error: 'Análisis no encontrado.' }); return; }
  res.json({ ok: true, analysis });
}

/**
 * DELETE /api/sty/analyses/:id
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
  const deleted = await deleteStyAnalysis(req.params.id);
  if (!deleted) { res.status(404).json({ ok: false, error: 'No encontrado.' }); return; }
  res.json({ ok: true });
}
