// Integración Bitrix24 Timeman: usuarios del departamento + su estado de jornada.
// Port de src/lib/bitrixTimeman.ts. Reusa el helper con reintentos/concurrencia del
// módulo financiero (timeman.status hace una llamada por usuario → conviene limitar).

import { bitrixFetch, mapLimit, BITRIX_CONCURRENCY } from '../../financial/lib/bitrixHttp.js';

const BASE_URL = process.env.BITRIX_BASE_URL || 'https://gehsuites.bitrix24.com/rest';
const WEBHOOK_USER_ID = process.env.BITRIX_WEBHOOK_USER_ID || '14';
const apiKey = process.env.APIKEY_BITRIX;
const departmentFilter = process.env.BITRIX_DEPARTMENT_ID || '18';

/**
 * @typedef {Object} BitrixUser
 * @property {number} id
 * @property {string} name
 */

/**
 * @typedef {Object} TimemanStatus
 * @property {number} userId
 * @property {string} status
 * @property {string|null} [timeStart]
 * @property {string|null} [timeFinish]
 * @property {number|null} [duration]
 */

/** @returns {Promise<BitrixUser[]>} */
export async function fetchBitrixUsers() {
  if (!apiKey) {
    console.warn('[bitrix] APIKEY_BITRIX no está definida');
    return [];
  }

  const url = `${BASE_URL}/${WEBHOOK_USER_ID}/${apiKey}/user.get.json?FILTER[ACTIVE]=true&FILTER[UF_DEPARTMENT]=${departmentFilter}`;
  const response = await bitrixFetch(url);
  if (!response.ok) throw new Error(`Bitrix user.get falló con status ${response.status}`);

  const data = /** @type {{ result?: Array<Record<string, unknown>> }} */ (await response.json());
  return (data.result || [])
    .map((user) => ({
      id: Number(user.ID ?? 0),
      name: [String(user.NAME || ''), String(user.LAST_NAME || '')].filter(Boolean).join(' ').trim() || `Usuario ${user.ID}`,
    }))
    .filter((user) => Number.isFinite(user.id) && user.id > 0);
}

/**
 * @param {number[]} userIds
 * @returns {Promise<TimemanStatus[]>}
 */
export async function fetchTimemanStatus(userIds) {
  if (!apiKey) return [];

  return mapLimit(userIds, BITRIX_CONCURRENCY, async (userId) => {
    const timestamp = Date.now();
    const url = `${BASE_URL}/${WEBHOOK_USER_ID}/${apiKey}/timeman.status?USER_ID=${userId}&timestamp=${timestamp}`;
    const response = await bitrixFetch(url);
    const data = /** @type {{ result?: { STATUS?: string, TIME_START?: string, TIME_FINISH?: string, DURATION?: number } }} */ (await response.json());
    return {
      userId,
      status: data.result?.STATUS || 'UNKNOWN',
      timeStart: data.result?.TIME_START || null,
      timeFinish: data.result?.TIME_FINISH || null,
      duration: data.result?.DURATION ?? null,
    };
  });
}
