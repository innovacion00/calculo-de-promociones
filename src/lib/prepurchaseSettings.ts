export interface PrepurchaseConfig {
  valorPrecompra: number;
  porcentajeAdicional: number; // e.g. 0.08 for 8%
  fechaInicial: string; // ISO date string
  fechaCorte: string | null;
  fechaBasePronostico: 'maxFile' | 'today' | 'manual';
  fechaBaseManual: string | null;
  consumoDiarioManual: number | null;
  consumoSemanalManual: number | null;
  consumoMensualManual: number | null;
}

export const DEFAULT_CONFIG: PrepurchaseConfig = {
  valorPrecompra: 3_916_220_000,
  porcentajeAdicional: 0.08,
  fechaInicial: '2025-06-01',
  fechaCorte: null,
  fechaBasePronostico: 'maxFile',
  fechaBaseManual: null,
  consumoDiarioManual: null,
  consumoSemanalManual: null,
  consumoMensualManual: null,
};

export function calcBeneficioComercial(config: PrepurchaseConfig): number {
  return config.valorPrecompra * config.porcentajeAdicional;
}

export function calcCupoTotal(config: PrepurchaseConfig): number {
  return config.valorPrecompra + calcBeneficioComercial(config);
}

export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPct(value: number): string {
  return (value * 100).toFixed(2) + '%';
}
