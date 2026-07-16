// Live read-only integration with Bitrix24 CRM — negociaciones fallidas pendientes de abono.
// Combina dos pipelines (CATEGORY_ID 0 y 26) filtradas por "Estado del pago" = Fallido.
// Independiente del submódulo Conciliaciones: otra categoría, otros campos de negocio.
// Bitrix es la única fuente de verdad; no se persiste nada.

import { HOTEL_ENUM, BANK_ENUM } from './bitrixEnums';

const BASE_URL = process.env.BITRIX_BASE_URL || 'https://gehsuites.bitrix24.com/rest';
const WEBHOOK_USER_ID = process.env.BITRIX_WEBHOOK_USER_ID || '14';
const apiKey = process.env.APIKEY_BITRIX;

const PAGE_SIZE = 50;
const MAX_PAGES = 60; // safety cap (~3000 records)

const PIPELINES: Array<{ categoryId: number; stageId: string }> = [
  { categoryId: 0, stageId: 'UC_SUE9QT' },
  { categoryId: 26, stageId: 'C26:UC_85UO2E' },
];

const FIELD = {
  hotel: 'UF_CRM_1718636597',
  bank: 'UF_CRM_1718396464904',
  netAmount: 'UF_CRM_1718396179138',
  failureReason: 'UF_CRM_1719435866964',
  paymentStatus: 'UF_CRM_1719519638392',
} as const;

const SELECT_FIELDS = [
  'ID', 'TITLE', 'STAGE_ID', 'CATEGORY_ID',
  FIELD.hotel, FIELD.bank, FIELD.netAmount, FIELD.failureReason, FIELD.paymentStatus,
];

export interface AbonoRecord {
  id: string;
  name?: string;
  hotelName?: string;
  bank?: string;
  netAmount?: number;
  failureReason?: string;
  status?: string;
}

export interface AbonoQuery {
  hotelName?: string;
  bank?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

type RawDeal = Record<string, unknown>;

function buildUrl(method: string, params: URLSearchParams): string {
  if (!apiKey) throw new Error('APIKEY_BITRIX no está configurada.');
  return `${BASE_URL}/${WEBHOOK_USER_ID}/${apiKey}/${method}.json?${params.toString()}`;
}

async function fetchDealsPage(
  categoryId: number,
  stageId: string,
  start: number,
): Promise<{ result: RawDeal[]; total: number }> {
  const params = new URLSearchParams();
  params.set('FILTER[CATEGORY_ID]', String(categoryId));
  params.set('FILTER[STAGE_ID]', stageId);
  params.set(`FILTER[%${FIELD.paymentStatus}]`, 'Fallido');
  SELECT_FIELDS.forEach(f => params.append('select[]', f));
  params.set('start', String(start));

  const res = await fetch(buildUrl('crm.deal.list', params), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Bitrix crm.deal.list falló con status ${res.status}`);
  const data = (await res.json()) as { result?: RawDeal[]; total?: number; error_description?: string };
  if (!data.result) throw new Error(data.error_description || 'Respuesta inválida de Bitrix crm.deal.list');
  return { result: data.result, total: data.total ?? data.result.length };
}

async function fetchPipelineDeals(categoryId: number, stageId: string): Promise<RawDeal[]> {
  const first = await fetchDealsPage(categoryId, stageId, 0);
  const all = [...first.result];

  const remainingStarts: number[] = [];
  for (let start = PAGE_SIZE; start < first.total; start += PAGE_SIZE) remainingStarts.push(start);

  const pages = await Promise.all(
    remainingStarts.slice(0, MAX_PAGES).map(start => fetchDealsPage(categoryId, stageId, start)),
  );
  for (const p of pages) all.push(...p.result);

  return all;
}

async function fetchAllDeals(): Promise<RawDeal[]> {
  const perPipeline = await Promise.all(PIPELINES.map(p => fetchPipelineDeals(p.categoryId, p.stageId)));
  return perPipeline.flat();
}

function parseMoney(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const [amount] = String(raw).split('|');
  const n = parseFloat(amount);
  return isNaN(n) ? undefined : n;
}

export function mapDeal(deal: RawDeal): AbonoRecord {
  const hotelIds = (deal[FIELD.hotel] as unknown[]) || [];
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

export async function listAbonos(q: AbonoQuery): Promise<{ data: AbonoRecord[]; total: number }> {
  const rawDeals = await fetchAllDeals();
  let records = rawDeals.map(mapDeal);

  if (q.hotelName) records = records.filter(r => r.hotelName === q.hotelName);
  if (q.bank) records = records.filter(r => r.bank === q.bank);
  if (q.search) {
    const s = q.search.toLowerCase();
    records = records.filter(r =>
      (r.name ?? '').toLowerCase().includes(s) ||
      (r.hotelName ?? '').toLowerCase().includes(s) ||
      (r.bank ?? '').toLowerCase().includes(s),
    );
  }

  records.sort((a, b) => Number(b.id) - Number(a.id));

  const total = records.length;
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 18;
  const start = (page - 1) * pageSize;
  return { data: records.slice(start, start + pageSize), total };
}

export async function getAbonosStats(): Promise<{ total: number; totalNetAmount: number }> {
  const rawDeals = await fetchAllDeals();
  const records = rawDeals.map(mapDeal);
  return {
    total: records.length,
    totalNetAmount: records.reduce((acc, r) => acc + (r.netAmount ?? 0), 0),
  };
}
