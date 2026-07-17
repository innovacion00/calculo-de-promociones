// Integración read-only con Bitrix24 CRM — negociaciones fallidas pendientes de abono.
// Port de src/lib/bitrixAbonos.ts. Combina pipelines CATEGORY_ID 0 y 26 filtradas por
// "Estado del pago" = Fallido. Bitrix es la única fuente de verdad; no se persiste nada.

import { HOTEL_ENUM, BANK_ENUM } from './bitrixEnums.js';
import { bitrixFetch, mapLimit, BITRIX_CONCURRENCY } from './bitrixHttp.js';

const BASE_URL = process.env.BITRIX_BASE_URL || 'https://gehsuites.bitrix24.com/rest';
const WEBHOOK_USER_ID = process.env.BITRIX_WEBHOOK_USER_ID || '14';
const apiKey = process.env.APIKEY_BITRIX;

const PAGE_SIZE = 50;
const MAX_PAGES = 60; // tope de seguridad (~3000 registros)

const PIPELINES = [
  { categoryId: 0, stageId: 'UC_SUE9QT' },
  { categoryId: 26, stageId: 'C26:UC_85UO2E' },
];

const FIELD = {
  hotel: 'UF_CRM_1718636597',
  bank: 'UF_CRM_1718396464904',
  netAmount: 'UF_CRM_1718396179138',
  failureReason: 'UF_CRM_1719435866964',
  paymentStatus: 'UF_CRM_1719519638392',
};

const SELECT_FIELDS = [
  'ID', 'TITLE', 'STAGE_ID', 'CATEGORY_ID',
  FIELD.hotel, FIELD.bank, FIELD.netAmount, FIELD.failureReason, FIELD.paymentStatus,
];

/**
 * @typedef {Object} AbonoRecord
 * @property {string} id
 * @property {string} [name]
 * @property {string} [hotelName]
 * @property {string} [bank]
 * @property {number} [netAmount]
 * @property {string} [failureReason]
 * @property {string} [status]
 */

/**
 * @typedef {Object} AbonoQuery
 * @property {string} [hotelName]
 * @property {string} [bank]
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
 * @param {number} categoryId
 * @param {string} stageId
 * @param {number} start
 * @returns {Promise<{ result: RawDeal[], total: number }>}
 */
async function fetchDealsPage(categoryId, stageId, start) {
  const params = new URLSearchParams();
  params.set('FILTER[CATEGORY_ID]', String(categoryId));
  params.set('FILTER[STAGE_ID]', stageId);
  params.set(`FILTER[%${FIELD.paymentStatus}]`, 'Fallido');
  SELECT_FIELDS.forEach((f) => params.append('select[]', f));
  params.set('start', String(start));

  const res = await bitrixFetch(buildUrl('crm.deal.list', params));
  if (!res.ok) throw new Error(`Bitrix crm.deal.list falló con status ${res.status}`);
  const data = /** @type {{ result?: RawDeal[], total?: number, error_description?: string }} */ (await res.json());
  if (!data.result) throw new Error(data.error_description || 'Respuesta inválida de Bitrix crm.deal.list');
  return { result: data.result, total: data.total ?? data.result.length };
}

/**
 * @param {number} categoryId
 * @param {string} stageId
 * @returns {Promise<RawDeal[]>}
 */
async function fetchPipelineDeals(categoryId, stageId) {
  const first = await fetchDealsPage(categoryId, stageId, 0);
  const all = [...first.result];

  const remainingStarts = [];
  for (let start = PAGE_SIZE; start < first.total; start += PAGE_SIZE) remainingStarts.push(start);

  const pages = await mapLimit(
    remainingStarts.slice(0, MAX_PAGES),
    BITRIX_CONCURRENCY,
    (start) => fetchDealsPage(categoryId, stageId, start),
  );
  for (const p of pages) all.push(...p.result);
  return all;
}

// Caché TTL en memoria: list + stats + paginación comparten un mismo crawl.
const CACHE_TTL = 30_000;
/** @type {{ at: number, data: RawDeal[] } | null} */
let _dealsCache = null;

/** @returns {Promise<RawDeal[]>} */
async function fetchAllDeals() {
  if (_dealsCache && Date.now() - _dealsCache.at < CACHE_TTL) return _dealsCache.data;
  const perPipeline = await Promise.all(PIPELINES.map((p) => fetchPipelineDeals(p.categoryId, p.stageId)));
  const all = perPipeline.flat();
  _dealsCache = { at: Date.now(), data: all };
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
 * @returns {AbonoRecord}
 */
export function mapDeal(deal) {
  const hotelIds = /** @type {unknown[]} */ (deal[FIELD.hotel]) || [];
  const hotelId = hotelIds.length ? String(hotelIds[0]) : undefined;
  const bankId = deal[FIELD.bank] ? String(deal[FIELD.bank]) : undefined;

  return {
    id: String(deal.ID),
    name: deal.TITLE ? String(deal.TITLE) : undefined,
    hotelName: hotelId ? HOTEL_ENUM[hotelId] : undefined,
    bank: bankId ? BANK_ENUM[bankId] : undefined,
    netAmount: parseMoney(deal[FIELD.netAmount]),
    failureReason: deal[FIELD.failureReason] ? String(deal[FIELD.failureReason]) : undefined,
    status: deal[FIELD.paymentStatus] ? String(deal[FIELD.paymentStatus]) : undefined,
  };
}

/**
 * @param {AbonoQuery} q
 * @returns {Promise<{ data: AbonoRecord[], total: number }>}
 */
export async function listAbonos(q) {
  const rawDeals = await fetchAllDeals();
  let records = rawDeals.map(mapDeal);

  if (q.hotelName) records = records.filter((r) => r.hotelName === q.hotelName);
  if (q.bank) records = records.filter((r) => r.bank === q.bank);
  if (q.search) {
    const s = q.search.toLowerCase();
    records = records.filter((r) =>
      (r.name ?? '').toLowerCase().includes(s) ||
      (r.hotelName ?? '').toLowerCase().includes(s) ||
      (r.bank ?? '').toLowerCase().includes(s));
  }

  records.sort((a, b) => Number(b.id) - Number(a.id));

  const total = records.length;
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 18;
  const start = (page - 1) * pageSize;
  return { data: records.slice(start, start + pageSize), total };
}

/** @returns {Promise<{ total: number, totalNetAmount: number }>} */
export async function getAbonosStats() {
  const rawDeals = await fetchAllDeals();
  const records = rawDeals.map(mapDeal);
  return {
    total: records.length,
    totalNetAmount: records.reduce((acc, r) => acc + (r.netAmount ?? 0), 0),
  };
}
