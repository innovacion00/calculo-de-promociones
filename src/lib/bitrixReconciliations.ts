// Live read-only integration with Bitrix24 CRM (category 22 = "Conciliaciones").
// Data is fetched on demand and never persisted — Bitrix is the single source of truth.
// A deal is "conciliado" only when STAGE_ID equals RECONCILED_STAGE_ID; any other stage is "no conciliado".

import { HOTEL_ENUM, BANK_ENUM, HOTEL_NAME_TO_ID, BANK_NAME_TO_ID } from './bitrixEnums';

const BASE_URL = process.env.BITRIX_BASE_URL || 'https://gehsuites.bitrix24.com/rest';
const WEBHOOK_USER_ID = process.env.BITRIX_WEBHOOK_USER_ID || '14';
const apiKey = process.env.APIKEY_BITRIX;

const CATEGORY_ID = 22;
const RECONCILED_STAGE_ID = 'C22:UC_HZGYY4';
const PAGE_SIZE = 50;
const MAX_PAGES = 60; // safety cap (~3000 records)

const FIELD = {
  hotel: 'UF_CRM_1718636597',
  bank: 'UF_CRM_1718396464904',
  netAmount: 'UF_CRM_1718396179138',
  movementDate: 'UF_CRM_1718396297448',
  confirmationNumber: 'UF_CRM_1718397018945',
  notes: 'UF_CRM_1718396768717',
  mirrorNotes: 'UF_CRM_1782163973301',
} as const;

const SELECT_FIELDS = [
  'ID', 'TITLE', 'STAGE_ID', 'CATEGORY_ID',
  FIELD.hotel, FIELD.bank, FIELD.netAmount, FIELD.movementDate, FIELD.confirmationNumber, FIELD.notes, FIELD.mirrorNotes,
];

export type ReconciledStatus = 'reconciled' | 'unreconciled';

export interface BitrixReconciliation {
  id: string;
  movementName?: string;
  hotelName?: string;
  bank?: string;
  movementDate?: string;
  netAmount?: number;
  confirmationNumber?: string;
  notes?: string;
  mirrorNotes?: string;
  reconciledStatus: ReconciledStatus;
}

export interface ReconciliationQuery {
  hotelName?: string;
  bank?: string;
  status?: ReconciledStatus;
  dateFrom?: string;
  dateTo?: string;
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
  filterParams: Array<[string, string]>,
  start: number,
): Promise<{ result: RawDeal[]; total: number }> {
  const params = new URLSearchParams();
  filterParams.forEach(([k, v]) => params.append(k, v));
  SELECT_FIELDS.forEach(f => params.append('select[]', f));
  params.set('start', String(start));

  const res = await fetch(buildUrl('crm.deal.list', params), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Bitrix crm.deal.list falló con status ${res.status}`);
  const data = (await res.json()) as { result?: RawDeal[]; total?: number; error_description?: string };
  if (!data.result) throw new Error(data.error_description || 'Respuesta inválida de Bitrix crm.deal.list');
  return { result: data.result, total: data.total ?? data.result.length };
}

async function fetchAllDeals(filters: {
  hotelName?: string;
  bank?: string;
  status?: ReconciledStatus;
}): Promise<RawDeal[]> {
  const filterParams: Array<[string, string]> = [['FILTER[CATEGORY_ID]', String(CATEGORY_ID)]];

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

  const remainingStarts: number[] = [];
  for (let start = PAGE_SIZE; start < first.total; start += PAGE_SIZE) remainingStarts.push(start);

  const pages = await Promise.all(
    remainingStarts.slice(0, MAX_PAGES).map(start => fetchDealsPage(filterParams, start)),
  );
  for (const p of pages) all.push(...p.result);

  return all;
}

function parseMoney(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const [amount] = String(raw).split('|');
  const n = parseFloat(amount);
  return isNaN(n) ? undefined : n;
}

export function mapDeal(deal: RawDeal): BitrixReconciliation {
  const hotelIds = (deal[FIELD.hotel] as unknown[]) || [];
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

export async function listBitrixReconciliations(
  q: ReconciliationQuery,
): Promise<{ data: BitrixReconciliation[]; total: number }> {
  const rawDeals = await fetchAllDeals({ hotelName: q.hotelName, bank: q.bank, status: q.status });
  let records = rawDeals.map(mapDeal);

  if (q.dateFrom) records = records.filter(r => !!r.movementDate && r.movementDate >= q.dateFrom!);
  if (q.dateTo) records = records.filter(r => !!r.movementDate && r.movementDate <= q.dateTo!);

  if (q.search) {
    const s = q.search.toLowerCase();
    records = records.filter(r =>
      (r.hotelName ?? '').toLowerCase().includes(s) ||
      (r.bank ?? '').toLowerCase().includes(s) ||
      (r.confirmationNumber ?? '').toLowerCase().includes(s) ||
      (r.movementName ?? '').toLowerCase().includes(s),
    );
  }

  records.sort((a, b) => (b.movementDate ?? '').localeCompare(a.movementDate ?? '') || b.id.localeCompare(a.id));

  const total = records.length;
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 18;
  const start = (page - 1) * pageSize;
  return { data: records.slice(start, start + pageSize), total };
}

export async function getBitrixReconciliationById(id: string): Promise<BitrixReconciliation | null> {
  const params = new URLSearchParams();
  params.set('id', id);
  const res = await fetch(buildUrl('crm.deal.get', params), { cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: RawDeal };
  if (!data.result || String(data.result.CATEGORY_ID) !== String(CATEGORY_ID)) return null;
  return mapDeal(data.result);
}

export async function getBitrixReconciliationStats(): Promise<{
  total: number;
  totalAmount: number;
  reconciled: number;
  reconciledAmount: number;
  unreconciled: number;
  unreconciledAmount: number;
  noHotel: number;
  noConfirmation: number;
}> {
  const rawDeals = await fetchAllDeals({});
  const records = rawDeals.map(mapDeal);
  const sum = (arr: BitrixReconciliation[]) => arr.reduce((acc, r) => acc + (r.netAmount ?? 0), 0);
  const reconciled = records.filter(r => r.reconciledStatus === 'reconciled');
  const unreconciled = records.filter(r => r.reconciledStatus === 'unreconciled');

  return {
    total: records.length,
    totalAmount: sum(records),
    reconciled: reconciled.length,
    reconciledAmount: sum(reconciled),
    unreconciled: unreconciled.length,
    unreconciledAmount: sum(unreconciled),
    noHotel: records.filter(r => !r.hotelName).length,
    noConfirmation: records.filter(r => !r.confirmationNumber).length,
  };
}

export { getHotelOptions, getBankOptions } from './bitrixEnums';
