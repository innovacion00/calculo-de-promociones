import { ClassifiedRow } from './reservationClassifier';
import { FinancialSummary, HotelSummary } from './financialCalculations';
import { format, startOfWeek, startOfMonth, getISOWeek, getYear } from 'date-fns';
import { es } from 'date-fns/locale';

export interface DailyDataPoint {
  date: string;
  ventaBruta: number;
  consumoNeto: number;
  reservas: number;
  overCommission: number;
}

export interface WeeklyDataPoint {
  semana: string;
  ventaBruta: number;
  overCommission: number;
  consumoNeto: number;
  reservas: number;
}

export interface MonthlyDataPoint {
  mes: string;
  ventaBruta: number;
  overCommission: number;
  consumoNeto: number;
  reservas: number;
  porcentajeConsumido: number;
}

export interface AccumulatedPoint {
  date: string;
  acumulado: number;
  cupoTotal: number;
  saldo: number;
}

export interface BalancePoint {
  date: string;
  saldoComercial: number;
  saldoNeto: number;
}

export interface ReservationDistribution {
  name: string;
  value: number;
  color: string;
}

function getDateStr(row: ClassifiedRow): string {
  if (!row.date) return '';
  return format(row.date, 'yyyy-MM-dd');
}

export function buildDailyData(rows: ClassifiedRow[]): DailyDataPoint[] {
  const map = new Map<string, DailyDataPoint>();

  for (const row of rows) {
    const dateStr = getDateStr(row);
    if (!dateStr) continue;

    if (!map.has(dateStr)) {
      map.set(dateStr, { date: dateStr, ventaBruta: 0, consumoNeto: 0, reservas: 0, overCommission: 0 });
    }
    const pt = map.get(dateStr)!;

    if (row.status === 'effective') {
      pt.ventaBruta += row.amount;
      pt.consumoNeto += row.amount;
      pt.reservas += 1;
    } else if (row.status === 'overCommission') {
      pt.overCommission += row.amount; // negative
      pt.consumoNeto += row.amount;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function buildWeeklyData(rows: ClassifiedRow[]): WeeklyDataPoint[] {
  const map = new Map<string, WeeklyDataPoint>();

  for (const row of rows) {
    if (!row.date) continue;
    const weekStart = startOfWeek(row.date, { weekStartsOn: 1 });
    const weekNum = getISOWeek(row.date);
    const year = getYear(weekStart);
    const key = `${year}-S${String(weekNum).padStart(2, '0')}`;

    if (!map.has(key)) {
      map.set(key, { semana: key, ventaBruta: 0, overCommission: 0, consumoNeto: 0, reservas: 0 });
    }
    const pt = map.get(key)!;

    if (row.status === 'effective') {
      pt.ventaBruta += row.amount;
      pt.consumoNeto += row.amount;
      pt.reservas += 1;
    } else if (row.status === 'overCommission') {
      pt.overCommission += Math.abs(row.amount);
      pt.consumoNeto += row.amount;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.semana.localeCompare(b.semana));
}

export function buildMonthlyData(rows: ClassifiedRow[], cupoTotal: number): MonthlyDataPoint[] {
  const map = new Map<string, MonthlyDataPoint>();

  for (const row of rows) {
    if (!row.date) continue;
    const key = format(row.date, 'yyyy-MM');
    const label = format(row.date, 'MMM yyyy', { locale: es });

    if (!map.has(key)) {
      map.set(key, { mes: label, ventaBruta: 0, overCommission: 0, consumoNeto: 0, reservas: 0, porcentajeConsumido: 0 });
    }
    const pt = map.get(key)!;

    if (row.status === 'effective') {
      pt.ventaBruta += row.amount;
      pt.consumoNeto += row.amount;
      pt.reservas += 1;
    } else if (row.status === 'overCommission') {
      pt.overCommission += Math.abs(row.amount);
      pt.consumoNeto += row.amount;
    }
  }

  const result = Array.from(map.values());
  result.sort((a, b) => a.mes.localeCompare(b.mes));

  // Add % consumed
  for (const pt of result) {
    pt.porcentajeConsumido = cupoTotal > 0 ? (pt.ventaBruta / cupoTotal) * 100 : 0;
  }

  return result;
}

export function buildAccumulatedData(
  dailyData: DailyDataPoint[],
  cupoTotal: number
): AccumulatedPoint[] {
  let acumulado = 0;
  return dailyData.map((d) => {
    acumulado += d.ventaBruta;
    return {
      date: d.date,
      acumulado,
      cupoTotal,
      saldo: cupoTotal - acumulado,
    };
  });
}

export function buildBalanceData(
  dailyData: DailyDataPoint[],
  cupoTotal: number,
  valorPrecompra: number
): BalancePoint[] {
  let acumuladoBruto = 0;
  let acumuladoNeto = 0;
  return dailyData.map((d) => {
    acumuladoBruto += d.ventaBruta;
    acumuladoNeto += d.consumoNeto;
    return {
      date: d.date,
      saldoComercial: cupoTotal - acumuladoBruto,
      saldoNeto: valorPrecompra - acumuladoNeto,
    };
  });
}

export function buildReservationDistribution(
  rows: ClassifiedRow[]
): ReservationDistribution[] {
  const effective = rows.filter((r) => r.status === 'effective').length;
  const cancelled = rows.filter((r) => r.status === 'cancelled').length;
  const duplicates = rows.filter((r) => r.status === 'duplicate').length;
  const review = rows.filter((r) => r.status === 'review').length;
  const modifications = rows.filter((r) => r.status === 'modification').length;

  return [
    { name: 'Efectivas', value: effective, color: '#22c55e' },
    { name: 'Canceladas', value: cancelled, color: '#ef4444' },
    { name: 'Duplicadas', value: duplicates, color: '#f97316' },
    { name: 'En revisión', value: review, color: '#eab308' },
    { name: 'Modificaciones', value: modifications, color: '#8b5cf6' },
  ].filter((d) => d.value > 0);
}

export function buildRealVsProjected(
  dailyData: DailyDataPoint[],
  promedioDiario: number
): { date: string; real: number; proyectado: number }[] {
  let realAcum = 0;
  let proyAcum = 0;
  return dailyData.map((d) => {
    realAcum += d.consumoNeto;
    proyAcum += promedioDiario;
    return { date: d.date, real: realAcum, proyectado: proyAcum };
  });
}
