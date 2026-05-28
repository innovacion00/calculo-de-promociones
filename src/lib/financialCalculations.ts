import { ClassifiedRow, getEffectiveReservations, getOverCommissionRows } from './reservationClassifier';
import { PrepurchaseConfig, calcCupoTotal } from './prepurchaseSettings';

export interface FinancialSummary {
  cupoTotal: number;
  ventaBrutaEfectiva: number;
  overCommissionEfectiva: number;
  consumoNeto: number;
  saldoComercialDisponible: number;
  saldoNetoContraPrepago: number;
  porcentajeConsumido: number;
  porcentajeDisponible: number;
  numReservasEfectivas: number;
  numReservasCanceladas: number;
  numDuplicados: number;
  numEnRevision: number;
  ticketPromedio: number;
  promedioDiario: number;
  promedioSemanal: number;
  promedioMensual: number;
  diasConDatos: number;
  semanasConDatos: number;
  mesesConDatos: number;
  fechaMaxima: Date | null;
  fechaMinima: Date | null;
}

export function computeFinancials(
  rows: ClassifiedRow[],
  config: PrepurchaseConfig
): FinancialSummary {
  const cupoTotal = calcCupoTotal(config);
  const effective = getEffectiveReservations(rows);
  const overCommRows = getOverCommissionRows(rows);

  const ventaBrutaEfectiva = effective.reduce((s, r) => s + r.amount, 0);

  // Only include over-commission rows where the base reservation ID is effective
  const effectiveIds = new Set(effective.map((r) => r.reservationId));
  const overCommEfectiva = overCommRows
    .filter((r) => effectiveIds.has(r.reservationId))
    .reduce((s, r) => s + r.amount, 0); // these are negative values

  const consumoNeto = ventaBrutaEfectiva + overCommEfectiva;
  const saldoComercialDisponible = cupoTotal - ventaBrutaEfectiva;
  const saldoNetoContraPrepago = config.valorPrecompra - consumoNeto;
  const porcentajeConsumido = cupoTotal > 0 ? ventaBrutaEfectiva / cupoTotal : 0;
  const porcentajeDisponible = cupoTotal > 0 ? saldoComercialDisponible / cupoTotal : 0;

  const numReservasEfectivas = effective.length;
  const numReservasCanceladas = rows.filter((r) => r.status === 'cancelled').length;
  const numDuplicados = rows.filter((r) => r.status === 'duplicate').length;
  const numEnRevision = rows.filter((r) => r.status === 'review').length;
  const ticketPromedio = numReservasEfectivas > 0 ? ventaBrutaEfectiva / numReservasEfectivas : 0;

  // Compute time span from effective reservations
  const dates = effective.map((r) => r.date).filter((d): d is Date => d !== null);
  dates.sort((a, b) => a.getTime() - b.getTime());

  const fechaMinima = dates.length > 0 ? dates[0] : null;
  const fechaMaxima = dates.length > 0 ? dates[dates.length - 1] : null;

  let diasConDatos = 0;
  let semanasConDatos = 0;
  let mesesConDatos = 0;

  if (fechaMinima && fechaMaxima) {
    const diffMs = fechaMaxima.getTime() - fechaMinima.getTime();
    diasConDatos = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    semanasConDatos = Math.max(1, diasConDatos / 7);
    mesesConDatos = Math.max(1, diasConDatos / 30.44);
  }

  const promedioDiario = diasConDatos > 0 ? consumoNeto / diasConDatos : 0;
  const promedioSemanal = semanasConDatos > 0 ? consumoNeto / semanasConDatos : 0;
  const promedioMensual = mesesConDatos > 0 ? consumoNeto / mesesConDatos : 0;

  return {
    cupoTotal,
    ventaBrutaEfectiva,
    overCommissionEfectiva: overCommEfectiva,
    consumoNeto,
    saldoComercialDisponible,
    saldoNetoContraPrepago,
    porcentajeConsumido,
    porcentajeDisponible,
    numReservasEfectivas,
    numReservasCanceladas,
    numDuplicados,
    numEnRevision,
    ticketPromedio,
    promedioDiario,
    promedioSemanal,
    promedioMensual,
    diasConDatos,
    semanasConDatos,
    mesesConDatos,
    fechaMaxima,
    fechaMinima,
  };
}

export interface HotelSummary {
  hotel: string;
  ventaEfectiva: number;
  numReservas: number;
  ticketPromedio: number;
  participacion: number;
}

export function computeHotelSummaries(rows: ClassifiedRow[]): HotelSummary[] {
  const effective = getEffectiveReservations(rows);
  const totalVenta = effective.reduce((s, r) => s + r.amount, 0);

  const map = new Map<string, { venta: number; count: number }>();
  for (const r of effective) {
    const prev = map.get(r.hotelBase) ?? { venta: 0, count: 0 };
    map.set(r.hotelBase, { venta: prev.venta + r.amount, count: prev.count + 1 });
  }

  return Array.from(map.entries())
    .map(([hotel, { venta, count }]) => ({
      hotel,
      ventaEfectiva: venta,
      numReservas: count,
      ticketPromedio: count > 0 ? venta / count : 0,
      participacion: totalVenta > 0 ? venta / totalVenta : 0,
    }))
    .sort((a, b) => b.ventaEfectiva - a.ventaEfectiva);
}
