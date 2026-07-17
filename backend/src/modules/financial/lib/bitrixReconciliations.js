// Integración read-only con Bitrix24 CRM (category 22 = "Conciliaciones").
// Port de src/lib/bitrixReconciliations.ts. Un deal está "conciliado" solo si STAGE_ID
// === RECONCILED_STAGE_ID. Se lee bajo demanda; nada se persiste.

import { HOTEL_ENUM, BANK_ENUM, HOTEL_NAME_TO_ID, BANK_NAME_TO_ID } from './bitrixEnums.js';
import { bitrixFetch, mapLimit, BITRIX_CONCURRENCY } from './bitrixHttp.js';

const BASE_URL = process.env.BITRIX_BASE_URL || 'https://gehsuites.bitrix24.com/rest';
const WEBHOOK_USER_ID = process.env.BITRIX_WEBHOOK_USER_ID || '14';
const apiKey = process.env.APIKEY_BITRIX;

const CATEGORY_ID = 22;
const RECONCILED_STAGE_ID = 'C22:UC_HZGYY4';
const PAGE_SIZE = 50;
const MAX_PAGES = 60;

const FIELD = {
  hotel: 'UF_CRM_1718636597',
  bank: 'UF_CRM_1718396464904',
  netAmount: 'UF_CRM_1718396179138',
  movementDate: 'UF_CRM_1718396297448',
  confirmationNumber: 'UF_CRM_1718397018945',
  notes: 'UF_CRM_1718396768717',
  mirrorNotes: 'UF_CRM_1782163973301',
};

const SELECT_FIELDS = [
  'ID', 'TITLE', 'STAGE_ID', 'CATEGORY_ID',
  FIELD.hotel, FIELD.bank, FIELD.netAmount, FIELD.movementDate, FIELD.confirmationNumber, FIELD.notes, FIELD.mirrorNotes,
];

/**
 * @typedef {'reconciled'|'unreconciled'} ReconciledStatus
 */

/**
 * @typedef {Object} BitrixReconciliation
 * @property {string} id
 * @property {string} [movementName]
 * @property {string} [hotelName]
 * @property {string} [bank]
 * @property {string} [movementDate]
 * @property {number} [netAmount]
 * @property {string} [confirmationNumber]
 * @property {string} [notes]
 * @property {string} [mirrorNotes]
 * @property {ReconciledStatus} reconciledStatus
 */

/**
 * @typedef {Object} ReconciliationQuery
 * @property {string} [hotelName]
 * @property {string} [bank]
 * @property {ReconciledStatus} [status]
 * @property {string} [dateFrom]
 * @property {string} [dateTo]
 * @property {string} [search]
 * @property {number} [page]
 * @property {number} [pageSize]
 */

/** @typedef {Record<string, unknown>} RawDeal */

/**
 * @param {string} method
 * @param {URLSearchParams} params
 * @returns {string}
 */
function buildUrl(method, params) {
  if (!apiKey) throw new Error('APIKEY_BITRIX no está configurada.');
  return `${BASE_URL}/${WEBHOOK_USER_ID}/${apiKey}/${method}.json?${params.toString()}`;
}

/**
 * @param {Array<[string, string]>} filterParams
 * @param {number} start
 * @returns {Promise<{ result: RawDeal[], total: number }>}
 */
async function fetchDealsPage(filterParams, start) {
  const params = new URLSearchParams();
  filterParams.forEach(([k, v]) => params.append(k, v));
  SELECT_FIELDS.forEach((f) => params.append('select[]', f));
  params.set('start', String(start));

  const res = await bitrixFetch(buildUrl('crm.deal.list', params));
  if (!res.ok) throw new Error(`Bitrix crm.deal.list falló con status ${res.status}`);
  const data = /** @type {{ result?: RawDeal[], total?: number, error_description?: string }} */ (await res.json());
  if (!data.result) throw new Error(data.error_description || 'Respuesta inválida de Bitrix crm.deal.list');
  return { result: data.result, total: data.total ?? data.result.length };
}

// Caché TTL en memoria: stats + list + paginación comparten un mismo crawl y no
// bombardean Bitrix ni re-descargan ~1816 deals en cada request.
const CACHE_TTL = 30_000;
/** @type {Map<string, { at: number, data: RawDeal[] }>} */
const _dealsCache = new Map();

/**
 * @param {{ hotelName?: string, bank?: string, status?: ReconciledStatus }} filters
 * @returns {Promise<RawDeal[]>}
 */
async function fetchAllDeals(filters) {
  const cacheKey = JSON.stringify(filters);
  const cached = _dealsCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data;

  /** @type {Array<[string, string]>} */
  const filterParams = [['FILTER[CATEGORY_ID]', String(CATEGORY_ID)]];

  if (filters.hotelName) {
    const hotelId = HOTEL_NAME_TO_ID[filters.hotelName];
    if (hotelId) filterParams.push([`FILTER[${FIELD.hotel}]`, hotelId]);
  }
  if (filters.bank) {
    const bankId = BANK_NAME_TO_ID[filters.bank];
    if (bankId) filterParams.push([`FILTER[${FIELD.bank}]`, bankId]);
  }
  if (filters.status === 'reconciled') {
    filterParams.push(['FILTER[STAGE_ID]', RECONCILED_STAGE_ID]);
  } else if (filters.status === 'unreconciled') {
    filterParams.push(['FILTER[!STAGE_ID]', RECONCILED_STAGE_ID]);
  }

  const first = await fetchDealsPage(filterParams, 0);
  const all = [...first.result];

  const remainingStarts = [];
  for (let start = PAGE_SIZE; start < first.total; start += PAGE_SIZE) remainingStarts.push(start);

  const pages = await mapLimit(
    remainingStarts.slice(0, MAX_PAGES),
    BITRIX_CONCURRENCY,
    (start) => fetchDealsPage(filterParams, start),
  );
  for (const p of pages) all.push(...p.result);

  _dealsCache.set(cacheKey, { at: Date.now(), data: all });
  return all;
}

/**
 * @param {unknown} raw
 * @returns {number|undefined}
 */
function parseMoney(raw) {
  if (raw == null) return undefined;
  const [amount] = String(raw).split('|');
  const n = parseFloat(amount);
  return isNaN(n) ? undefined : n;
}

/**
 * @param {RawDeal} deal
 * @returns {BitrixReconciliation}
 */
export function mapDeal(deal) {
  const hotelIds = /** @type {unknown[]} */ (deal[FIELD.hotel]) || [];
  const hotelId = hotelIds.length ? String(hotelIds[0]) : undefined;
  const bankId = deal[FIELD.bank] ? String(deal[FIELD.bank]) : undefined;
  const stageId = String(deal.STAGE_ID ?? '');
  const rawDate = deal[FIELD.movementDate];

  return {
    id: String(deal.ID),
    movementName: deal.TITLE ? String(deal.TITLE) : undefined,
    hotelName: hotelId ? HOTEL_ENUM[hotelId] : undefined,
    bank: bankId ? BANK_ENUM[bankId] : undefined,
    movementDate: rawDate ? String(rawDate).slice(0, 10) : undefined,
    netAmount: parseMoney(deal[FIELD.netAmount]),
    confirmationNumber: deal[FIELD.confirmationNumber] ? String(deal[FIELD.confirmationNumber]) : undefined,
    notes: deal[FIELD.notes] ? String(deal[FIELD.notes]) : undefined,
    mirrorNotes: deal[FIELD.mirrorNotes] ? String(deal[FIELD.mirrorNotes]) : undefined,
    reconciledStatus: stageId === RECONCILED_STAGE_ID ? 'reconciled' : 'unreconciled',
  };
}

/**
 * @param {ReconciliationQuery} q
 * @returns {Promise<{ data: BitrixReconciliation[], total: number }>}
 */
export async function listBitrixReconciliations(q) {
  const rawDeals = await fetchAllDeals({ hotelName: q.hotelName, bank: q.bank, status: q.status });
  let records = rawDeals.map(mapDeal);

  if (q.dateFrom) records = records.filter((r) => !!r.movementDate && r.movementDate >= /** @type {string} */ (q.dateFrom));
  if (q.dateTo) records = records.filter((r) => !!r.movementDate && r.movementDate <= /** @type {string} */ (q.dateTo));

  if (q.search) {
    const s = q.search.toLowerCase();
    records = records.filter((r) =>
      (r.hotelName ?? '').toLowerCase().includes(s) ||
      (r.bank ?? '').toLowerCase().includes(s) ||
      (r.confirmationNumber ?? '').toLowerCase().includes(s) ||
      (r.movementName ?? '').toLowerCase().includes(s));
  }

  records.sort((a, b) => (b.movementDate ?? '').localeCompare(a.movementDate ?? '') || b.id.localeCompare(a.id));

  const total = records.length;
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 18;
  const start = (page - 1) * pageSize;
  return { data: records.slice(start, start + pageSize), total };
}

/**
 * @param {string} id
 * @returns {Promise<BitrixReconciliation|null>}
 */
export async function getBitrixReconciliationById(id) {
  const params = new URLSearchParams();
  params.set('id', id);
  const res = await bitrixFetch(buildUrl('crm.deal.get', params));
  if (!res.ok) return null;
  const data = /** @type {{ result?: RawDeal }} */ (await res.json());
  if (!data.result || String(data.result.CATEGORY_ID) !== String(CATEGORY_ID)) return null;
  return mapDeal(data.result);
}

/**
 * @returns {Promise<{ total: number, totalAmount: number, reconciled: number, reconciledAmount: number, unreconciled: number, unreconciledAmount: number, noHotel: number, noConfirmation: number }>}
 */
export async function getBitrixReconciliationStats() {
  const rawDeals = await fetchAllDeals({});
  const records = rawDeals.map(mapDeal);
  /** @param {BitrixReconciliation[]} arr */
  const sum = (arr) => arr.reduce((acc, r) => acc + (r.netAmount ?? 0), 0);
  const reconciled = records.filter((r) => r.reconciledStatus === 'reconciled');
  const unreconciled = records.filter((r) => r.reconciledStatus === 'unreconciled');

  return {
    total: records.length,
    totalAmount: sum(records),
    reconciled: reconciled.length,
    reconciledAmount: sum(reconciled),
    unreconciled: unreconciled.length,
    unreconciledAmount: sum(unreconciled),
    noHotel: records.filter((r) => !r.hotelName).length,
    noConfirmation: records.filter((r) => !r.confirmationNumber).length,
  };
}

export { getHotelOptions, getBankOptions } from './bitrixEnums.js';
