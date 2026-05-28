import { ClassifiedRow } from './reservationClassifier';
import { FinancialSummary } from './financialCalculations';
import { PrepurchaseConfig } from './prepurchaseSettings';
import { classifyRisk, RiskLevel } from './riskClassifier';
import { addDays, differenceInDays } from 'date-fns';

export interface ForecastScenario {
  escenario: string;
  baseCalculo: string;
  saldoDisponible: number;
  consumoDiario: number;
  consumoSemanal: number;
  consumoMensual: number;
  diasRestantes: number;
  semanasRestantes: number;
  mesesRestantes: number;
  fechaEstimada: Date | null;
  nivelRiesgo: RiskLevel;
  observacion: string;
}

function avgConsumptionForPeriod(
  rows: ClassifiedRow[],
  baseDate: Date,
  daysBack: number | null
): { diario: number; total: number; dias: number } {
  const effective = rows.filter((r) => r.status === 'effective' && r.date !== null);
  const filtered = daysBack
    ? effective.filter((r) => {
        const diff = differenceInDays(baseDate, r.date!);
        return diff >= 0 && diff <= daysBack;
      })
    : effective;

  if (filtered.length === 0) return { diario: 0, total: 0, dias: 1 };

  const dates = filtered.map((r) => r.date!);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const dias = Math.max(1, differenceInDays(maxDate, minDate) + 1);
  const total = filtered.reduce((s, r) => s + r.amount, 0);

  return { diario: total / dias, total, dias };
}

function buildScenario(
  name: string,
  base: string,
  consumoDiario: number,
  saldoDisponible: number,
  baseDate: Date,
  multiplier = 1.0
): ForecastScenario {
  const cd = consumoDiario * multiplier;
  const diasRestantes = cd > 0 ? saldoDisponible / cd : Infinity;
  const semanasRestantes = diasRestantes / 7;
  const mesesRestantes = diasRestantes / 30.44;
  const fechaEstimada = cd > 0 && isFinite(diasRestantes)
    ? addDays(baseDate, Math.round(diasRestantes))
    : null;
  const riesgo = classifyRisk(isFinite(diasRestantes) ? diasRestantes : 999);

  let obs = '';
  if (riesgo === 'alto') obs = 'La bolsa se agotará pronto. Acción inmediata requerida.';
  else if (riesgo === 'medio') obs = 'Consumo dentro del rango aceptable. Monitorear.';
  else obs = 'Ritmo de consumo sostenible.';

  return {
    escenario: name,
    baseCalculo: base,
    saldoDisponible,
    consumoDiario: cd,
    consumoSemanal: cd * 7,
    consumoMensual: cd * 30.44,
    diasRestantes: isFinite(diasRestantes) ? Math.round(diasRestantes) : 9999,
    semanasRestantes: isFinite(semanasRestantes) ? Math.round(semanasRestantes * 10) / 10 : 9999,
    mesesRestantes: isFinite(mesesRestantes) ? Math.round(mesesRestantes * 10) / 10 : 9999,
    fechaEstimada,
    nivelRiesgo: riesgo,
    observacion: obs,
  };
}

export function computeForecastScenarios(
  rows: ClassifiedRow[],
  summary: FinancialSummary,
  config: PrepurchaseConfig,
  baseDate: Date
): ForecastScenario[] {
  const saldo = summary.saldoComercialDisponible;
  const scenarios: ForecastScenario[] = [];

  // Period-based scenarios
  const periods = [
    { label: 'Últimos 30 días', days: 30 },
    { label: 'Últimos 60 días', days: 60 },
    { label: 'Últimos 90 días', days: 90 },
    { label: 'Histórico completo', days: null },
  ];

  for (const { label, days } of periods) {
    const { diario } = avgConsumptionForPeriod(rows, baseDate, days);
    if (diario <= 0) continue;

    scenarios.push(buildScenario(`Conservador (${label})`, label, diario, saldo, baseDate, 0.8));
    scenarios.push(buildScenario(`Medio (${label})`, label, diario, saldo, baseDate, 1.0));
    scenarios.push(buildScenario(`Acelerado (${label})`, label, diario, saldo, baseDate, 1.2));
  }

  // Manual scenario
  const manualDiario =
    config.consumoDiarioManual ??
    (config.consumoSemanalManual ? config.consumoSemanalManual / 7 : null) ??
    (config.consumoMensualManual ? config.consumoMensualManual / 30.44 : null);

  if (manualDiario && manualDiario > 0) {
    scenarios.push(buildScenario('Manual', 'Valor ingresado por usuario', manualDiario, saldo, baseDate, 1.0));
  }

  return scenarios;
}

export interface ProjectionPoint {
  date: Date;
  label: string;
  saldo: number;
}

export function buildProjectionTimeline(
  baseDate: Date,
  initialSaldo: number,
  consumoDiario: number,
  maxDays = 365
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  if (consumoDiario <= 0) return points;

  const daysToZero = Math.min(Math.ceil(initialSaldo / consumoDiario), maxDays);
  const step = Math.max(1, Math.floor(daysToZero / 50));

  for (let d = 0; d <= daysToZero; d += step) {
    const saldo = Math.max(0, initialSaldo - consumoDiario * d);
    const date = addDays(baseDate, d);
    points.push({
      date,
      label: date.toISOString().slice(0, 10),
      saldo,
    });
  }

  // Always include the zero point
  const lastDay = Math.ceil(initialSaldo / consumoDiario);
  const zeroDate = addDays(baseDate, lastDay);
  points.push({ date: zeroDate, label: zeroDate.toISOString().slice(0, 10), saldo: 0 });

  return points;
}
