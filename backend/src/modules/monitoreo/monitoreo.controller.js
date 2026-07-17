// Controladores de Monitoreo (estado de jornada de usuarios en Bitrix Timeman).
// Port de src/app/api/status/{users-status,paused}.

import { getDb } from '../../config/db.js';
import { fetchBitrixUsers, fetchTimemanStatus } from './lib/bitrixTimeman.js';

/**
 * GET /api/status/users-status — estado de todos los usuarios + guarda snapshot.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export async function getUsersStatus(_req, res) {
  const users = await fetchBitrixUsers();
  const statuses = await fetchTimemanStatus(users.map((u) => u.id));

  const payload = statuses.map((status) => {
    const user = users.find((item) => item.id === status.userId);
    return {
      id: status.userId,
      nombre: user?.name || `Usuario ${status.userId}`,
      status: status.status,
      timeStart: status.timeStart,
      timeFinish: status.timeFinish,
      duration: status.duration,
    };
  });

  // Snapshot histórico (best-effort, no bloquea la respuesta).
  try {
    const db = await getDb();
    await db.collection('timeman_snapshots').insertOne({
      capturedAt: new Date(),
      source: 'bitrix-timeman',
      count: payload.length,
      users: payload,
    });
  } catch (dbError) {
    console.error('[status] No se pudo guardar snapshot en MongoDB:', dbError);
  }

  res.json({ ok: true, users: payload });
}

/**
 * GET /api/status/paused — solo los usuarios en pausa.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export async function getPaused(_req, res) {
  const users = await fetchBitrixUsers();
  const statuses = await fetchTimemanStatus(users.map((u) => u.id));

  const paused = statuses
    .filter((item) => item.status === 'PAUSED')
    .map((item) => ({
      id: item.userId,
      nombre: users.find((u) => u.id === item.userId)?.name || `Usuario ${item.userId}`,
      status: item.status,
      timeFinish: item.timeFinish,
    }));

  res.json({ ok: true, paused });
}
