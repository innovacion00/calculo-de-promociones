// Controladores de Abonos (negociaciones fallidas por abonar, live desde Bitrix).
// Port de src/app/api/financial/abonos/*.

import { listAbonos, getAbonosStats } from './lib/bitrixAbonos.js';
import { getHotelOptions, getBankOptions } from './lib/bitrixEnums.js';
import { sendCsv } from './lib/csv.js';

/**
 * GET /api/financial/abonos
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function getAbonos(req, res) {
  const { hotelName, bank, search, page, pageSize } = req.query;
  const result = await listAbonos({
    hotelName: hotelName ? String(hotelName) : undefined,
    bank: bank ? String(bank) : undefined,
    search: search ? String(search) : undefined,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 18,
  });
  res.json({ ok: true, ...result });
}

/**
 * GET /api/financial/abonos/stats
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export async function getAbonosStatsHandler(_req, res) {
  const stats = await getAbonosStats();
  res.json({ ok: true, stats });
}

/**
 * GET /api/financial/abonos/distinct
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export async function getAbonosDistinct(_req, res) {
  res.json({ ok: true, hotels: getHotelOptions(), banks: getBankOptions() });
}

/**
 * GET /api/financial/abonos/export
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function exportAbonos(req, res) {
  const { hotelName, bank, search } = req.query;
  const { data } = await listAbonos({
    hotelName: hotelName ? String(hotelName) : undefined,
    bank: bank ? String(bank) : undefined,
    search: search ? String(search) : undefined,
    page: 1,
    pageSize: 10000,
  });

  const headers = ['Nombre', 'Hotel', 'Banco', 'Neto Abonar', 'Causa del Fallo', 'Estado'];
  const rows = data.map((r) => [r.name ?? '', r.hotelName ?? '', r.bank ?? '', r.netAmount ?? '', r.failureReason ?? '', r.status ?? '']);
  sendCsv(res, headers, rows, `abonos_${new Date().toISOString().slice(0, 10)}.csv`);
}
