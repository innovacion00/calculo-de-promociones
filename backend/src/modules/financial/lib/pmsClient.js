// Cliente REST del PMS on-prem (por hotel). Port de src/lib/pms/client.ts.
// Auth por hotel con token cacheado; endpoints GetHospedajesAsync y GetEstadoCuentaReserva.

const PMS_PORT = process.env.PMS_PORT ?? '59000';
const PMS_EMAIL = process.env.PMS_EMAIL;
const PMS_PASSWORD = process.env.PMS_PASSWORD;

export const HOTEL_ENTRIES = [
  { key: 'ip_aixo', name: 'Aixo' },
  { key: 'ip_azuan', name: 'Azuan' },
  { key: 'ip_rodadero', name: 'Rodadero' },
  { key: 'ip_avexi', name: 'Avexi' },
  { key: 'ip_abi', name: 'ABI' },
  { key: 'ip_madisson', name: 'Madisson' },
  { key: 'ip_windsor', name: 'Windsor' },
  { key: 'ip_marina', name: 'Marina' },
  { key: 'ip_axis', name: 'Axis' },
  { key: 'ip_sansiraka', name: 'San Siraka' },
  { key: 'ip_playa_salguero', name: 'Playa Salguero' },
  { key: 'ip_marques', name: 'Marqués' },
  { key: 'ip_aixo_remote', name: 'Aixo Remote' },
  { key: 'ip_boquilla', name: 'Boquilla' },
];

/**
 * @typedef {Object} PmsDetalleServicio
 * @property {string} fechaCargo
 * @property {number} folioId
 * @property {number} tarifa
 */

/**
 * @typedef {Object} PmsTitular
 * @property {string} tercero
 */

/**
 * @typedef {Object} PmsStay
 * @property {string} hotel
 * @property {number} folioId
 * @property {string} room
 * @property {string} checkIn
 * @property {string} checkOut
 * @property {number} reservaId
 * @property {string} codeReserva
 * @property {string} [canal]
 * @property {string} [localizador]
 * @property {PmsDetalleServicio[]} detalleServicios
 * @property {PmsTitular[]} titular
 */

/**
 * @typedef {Object} PmsPago
 * @property {string} formaPago
 * @property {number} monto
 */

/**
 * @typedef {Object} PmsStayEnriched
 * @property {PmsStay} stay
 * @property {string} hotelKey
 * @property {string} hotelName
 * @property {number} valorPagado
 * @property {string} [formaPago]
 */

/** @type {Map<string, { token: string, expiresAt: number }>} */
const _tokenCache = new Map();

/**
 * @param {string} key
 * @returns {string|undefined}
 */
function getHotelIp(key) {
  return process.env[key] ?? process.env[` ${key}`];
}

/**
 * Nombres de los hoteles que tienen IP configurada (los únicos consultables en el PMS).
 * @returns {string[]}
 */
export function getHotelsWithIp() {
  return HOTEL_ENTRIES.filter((h) => !!getHotelIp(h.key)).map((h) => h.name);
}

/**
 * @param {string} baseUrl
 * @returns {Promise<string>}
 */
async function getPmsToken(baseUrl) {
  const cached = _tokenCache.get(baseUrl);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const res = await fetch(`${baseUrl}/api/Autenticacion/Validar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: PMS_EMAIL, clave: PMS_PASSWORD }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`PMS auth failed (${res.status}) @ ${baseUrl}`);

  const json = /** @type {{ token: string, valido: string }} */ (await res.json());
  _tokenCache.set(baseUrl, { token: json.token, expiresAt: new Date(json.valido).getTime() });
  return json.token;
}

/**
 * @param {string} hotelKey
 * @param {string} dateFrom
 * @param {string} dateTo
 * @returns {Promise<PmsStay[]>}
 */
async function fetchHotelStays(hotelKey, dateFrom, dateTo) {
  const ip = getHotelIp(hotelKey);
  if (!ip) return [];

  const baseUrl = `${ip}:${PMS_PORT}`;
  const token = await getPmsToken(baseUrl);

  const url = new URL(`${baseUrl}/api/Analitica/GetHospedajesAsync`);
  url.searchParams.set('tipoConsulta', 'Check In');
  url.searchParams.set('DateFrom', dateFrom);
  url.searchParams.set('DateTo', dateTo);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`PMS stays failed (${res.status}) for ${hotelKey}`);

  const json = /** @type {{ isSuccess: boolean, result: PmsStay[] } | PmsStay[]} */ (await res.json());
  return Array.isArray(json) ? json : (json.result ?? []);
}

/**
 * @param {string} isoDate
 * @param {number} days
 * @returns {string}
 */
function subtractDays(isoDate, days) {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * @param {{ hotelName?: string, checkoutDate?: string }} params
 * @returns {Promise<Array<{ stay: PmsStay, hotelKey: string, hotelName: string }>>}
 */
export async function fetchAllPmsStays(params) {
  const dateTo = params.checkoutDate ?? new Date().toISOString().slice(0, 10);
  const dateFrom = subtractDays(dateTo, 15);

  const targets = params.hotelName
    ? HOTEL_ENTRIES.filter((h) => h.name === params.hotelName)
    : HOTEL_ENTRIES;

  const settled = await Promise.allSettled(
    targets.map((h) => fetchHotelStays(h.key, dateFrom, dateTo).then((stays) => ({ stays, hotel: h }))),
  );

  /** @type {Array<{ stay: PmsStay, hotelKey: string, hotelName: string }>} */
  const all = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      r.value.stays.forEach((stay) => all.push({ stay, hotelKey: r.value.hotel.key, hotelName: r.value.hotel.name }));
    } else {
      console.error('[PMS] stays fetch failed:', r.reason);
    }
  }
  return all;
}

/**
 * @param {string} baseUrl
 * @param {string} token
 * @param {string} localizador
 * @returns {Promise<{ valorPagado: number, formaPago?: string }>}
 */
async function fetchEstadoCuenta(baseUrl, token, localizador) {
  const res = await fetch(`${baseUrl}/api/EstadoCuenta/GetEstadoCuentaReserva`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ localizador, checkIn: null, checkOut: null }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`EstadoCuenta failed (${res.status}) for localizador ${localizador}`);

  const json = /** @type {{ isSuccess: boolean, result: Array<{ pagos: PmsPago[] }> }} */ (await res.json());
  const pagos = json.result?.[0]?.pagos ?? [];
  const valorPagado = pagos.reduce((s, p) => s + (p.monto ?? 0), 0);
  return { valorPagado, formaPago: pagos[0]?.formaPago };
}

/**
 * Enriquece una lista pre-filtrada de estancias con sus pagos.
 * Filtrar por checkOut ANTES de llamar aquí para minimizar llamadas.
 * @param {Array<{ stay: PmsStay, hotelKey: string, hotelName: string }>} stays
 * @returns {Promise<PmsStayEnriched[]>}
 */
export async function enrichStaysWithPayments(stays) {
  const settled = await Promise.allSettled(
    stays.map(async ({ stay, hotelKey, hotelName }) => {
      let valorPagado = 0;
      let formaPago;

      if (stay.localizador) {
        const ip = getHotelIp(hotelKey);
        if (ip) {
          const baseUrl = `${ip}:${PMS_PORT}`;
          const token = await getPmsToken(baseUrl);
          const payment = await fetchEstadoCuenta(baseUrl, token, stay.localizador);
          valorPagado = payment.valorPagado;
          formaPago = payment.formaPago;
        }
      }

      return { stay, hotelKey, hotelName, valorPagado, formaPago };
    }),
  );

  /** @type {PmsStayEnriched[]} */
  const enriched = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') enriched.push(r.value);
    else console.error('[PMS] EstadoCuenta failed:', r.reason);
  }
  return enriched;
}
