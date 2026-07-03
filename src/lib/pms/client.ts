const PMS_PORT = process.env.PMS_PORT ?? '59000';
const PMS_EMAIL = process.env.PMS_EMAIL!;
const PMS_PASSWORD = process.env.PMS_PASSWORD!;

export const HOTEL_ENTRIES: Array<{ key: string; name: string }> = [
  { key: 'ip_aixo',           name: 'Aixo' },
  { key: 'ip_azuan',          name: 'Azuan' },
  { key: 'ip_rodadero',       name: 'Rodadero' },
  { key: 'ip_avexi',          name: 'Avexi' },
  { key: 'ip_abi',            name: 'ABI' },
  { key: 'ip_madisson',       name: 'Madisson' },
  { key: 'ip_windsor',        name: 'Windsor' },
  { key: 'ip_marina',         name: 'Marina' },
  { key: 'ip_axis',           name: 'Axis' },
  { key: 'ip_sansiraka',      name: 'San Siraka' },
  { key: 'ip_playa_salguero', name: 'Playa Salguero' },
  { key: 'ip_marques',        name: 'Marqués' },
  { key: 'ip_aixo_remote',    name: 'Aixo Remote' },
  { key: 'ip_boquilla',       name: 'Boquilla' },
];

// ── PMS types ──────────────────────────────────────────────────────────────

export interface PmsDetalleServicio {
  fechaCargo: string;
  folioId: number;
  base: number;
  impuestos: number;
  hospedaje: number;
  alimentacion: number;
  tarifa: number;
  factura?: number;
}

export interface PmsTitular {
  id: string;
  folioId: number;
  tercero: string;
  birth?: string;
  sexo?: string;
  email?: string;
  contacto?: string;
  pais?: string;
  nacionalidad?: string;
}

export interface PmsStay {
  hotel: string;
  consulta: string;
  folioId: number;
  room: string;
  categoria?: string;
  checkIn: string;
  checkOut: string;
  checkInGrabado?: string;
  checkOutGrabado?: string;
  motivos?: string;
  reservaId: number;
  codeReserva: string;
  canal?: string;
  localizador?: string;
  paxAdultos?: number;
  paxInfantes?: number;
  segmento?: string;
  subSegmento?: string;
  reservaCreado?: string;
  planTarifario?: string;
  regimen?: string;
  detalleServicios: PmsDetalleServicio[];
  detalleProductos?: unknown[];
  titular: PmsTitular[];
}

export interface PmsPago {
  reservaId: number;
  rcId: number;
  evidenciaBase64: string | null;
  fecha: string;
  formaPago: string;
  monto: number;
}

export interface PmsEstadoCuenta {
  reservaId: number;
  titular: string;
  checkIn: string;
  checkOut: string;
  codeReserva: string;
  localizador: string;
  canalVentaId: string;
  pagos: PmsPago[];
}

export interface PmsStayEnriched {
  stay: PmsStay;
  hotelKey: string;
  hotelName: string;
  valorPagado: number;
  formaPago?: string;
}

// ── Token cache ────────────────────────────────────────────────────────────

interface TokenCache { token: string; expiresAt: number; }
const _tokenCache = new Map<string, TokenCache>();

function getHotelIp(key: string): string | undefined {
  return process.env[key] ?? process.env[` ${key}`];
}

async function getPmsToken(baseUrl: string): Promise<string> {
  const cached = _tokenCache.get(baseUrl);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const res = await fetch(`${baseUrl}/api/Autenticacion/Validar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: PMS_EMAIL, clave: PMS_PASSWORD }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`PMS auth failed (${res.status}) @ ${baseUrl}`);

  const json = await res.json() as { token: string; valido: string };
  _tokenCache.set(baseUrl, {
    token: json.token,
    expiresAt: new Date(json.valido).getTime(),
  });
  return json.token;
}

// ── Endpoint 1: hospedajes ─────────────────────────────────────────────────

async function fetchHotelStays(hotelKey: string, dateFrom: string, dateTo: string): Promise<PmsStay[]> {
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

  const json = await res.json() as { isSuccess: boolean; result: PmsStay[] } | PmsStay[];
  return Array.isArray(json) ? json : (json.result ?? []);
}

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function fetchAllPmsStays(params: {
  hotelName?: string;
  checkoutDate?: string;
}): Promise<Array<{ stay: PmsStay; hotelKey: string; hotelName: string }>> {
  const dateTo   = params.checkoutDate ?? new Date().toISOString().slice(0, 10);
  const dateFrom = subtractDays(dateTo, 15);

  const targets = params.hotelName
    ? HOTEL_ENTRIES.filter(h => h.name === params.hotelName)
    : HOTEL_ENTRIES;

  const settled = await Promise.allSettled(
    targets.map(h =>
      fetchHotelStays(h.key, dateFrom, dateTo).then(stays => ({ stays, hotel: h }))
    )
  );

  const all: Array<{ stay: PmsStay; hotelKey: string; hotelName: string }> = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      r.value.stays.forEach(stay =>
        all.push({ stay, hotelKey: r.value.hotel.key, hotelName: r.value.hotel.name })
      );
    } else {
      console.error('[PMS] stays fetch failed:', r.reason);
    }
  }
  return all;
}

// ── Endpoint 2: estado de cuenta por localizador ───────────────────────────

async function fetchEstadoCuenta(
  baseUrl: string,
  token: string,
  localizador: string,
): Promise<{ valorPagado: number; formaPago?: string }> {
  const res = await fetch(`${baseUrl}/api/EstadoCuenta/GetEstadoCuentaReserva`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ localizador, checkIn: null, checkOut: null }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`EstadoCuenta failed (${res.status}) for localizador ${localizador}`);

  const json = await res.json() as { isSuccess: boolean; result: PmsEstadoCuenta[] };
  const pagos = json.result?.[0]?.pagos ?? [];
  const valorPagado = pagos.reduce((s, p) => s + (p.monto ?? 0), 0);
  return { valorPagado, formaPago: pagos[0]?.formaPago };
}

// Enriches a pre-filtered list of stays with their payment data.
// Filter by checkOut date BEFORE calling this to minimize payment API calls.
export async function enrichStaysWithPayments(
  stays: Array<{ stay: PmsStay; hotelKey: string; hotelName: string }>,
): Promise<PmsStayEnriched[]> {
  const settled = await Promise.allSettled(
    stays.map(async ({ stay, hotelKey, hotelName }) => {
      let valorPagado = 0;
      let formaPago: string | undefined;

      if (stay.localizador) {
        const ip = getHotelIp(hotelKey);
        if (ip) {
          const baseUrl = `${ip}:${PMS_PORT}`;
          const token = await getPmsToken(baseUrl); // token is cached per hotel
          const payment = await fetchEstadoCuenta(baseUrl, token, stay.localizador);
          valorPagado = payment.valorPagado;
          formaPago   = payment.formaPago;
        }
      }

      return { stay, hotelKey, hotelName, valorPagado, formaPago };
    })
  );

  const enriched: PmsStayEnriched[] = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') enriched.push(r.value);
    else console.error('[PMS] EstadoCuenta failed:', r.reason);
  }
  return enriched;
}
