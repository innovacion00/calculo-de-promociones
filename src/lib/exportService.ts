import * as XLSX from 'xlsx';
import { ClassifiedRow } from './reservationClassifier';
import { ForecastScenario } from './forecastCalculations';
import { FinancialSummary } from './financialCalculations';
import { PrepurchaseConfig } from './prepurchaseSettings';
import { formatCOP, formatPct } from './prepurchaseSettings';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function rowToObj(r: ClassifiedRow) {
  return {
    'ID Reserva': r.reservationId,
    Hotel: r.hotelBase,
    Cliente: r.colE ?? '',
    Fecha: r.date ? r.date.toISOString().slice(0, 10) : '',
    Monto: r.amount,
    Estado: r.status,
  };
}

export function exportReservasEfectivas(rows: ClassifiedRow[]) {
  const data = rows.filter((r) => r.status === 'effective').map(rowToObj);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reservas Efectivas');
  XLSX.writeFile(wb, 'reservas_efectivas.xlsx');
}

export function exportReservasCanceladas(rows: ClassifiedRow[]) {
  const data = rows.filter((r) => r.status === 'cancelled').map(rowToObj);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Canceladas');
  XLSX.writeFile(wb, 'reservas_canceladas.xlsx');
}

export function exportInconsistencias(rows: ClassifiedRow[]) {
  const data = rows.filter((r) => r.status === 'review').map(rowToObj);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inconsistencias');
  XLSX.writeFile(wb, 'inconsistencias.xlsx');
}

export function exportDuplicados(rows: ClassifiedRow[]) {
  const data = rows.filter((r) => r.status === 'duplicate').map(rowToObj);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Duplicados');
  XLSX.writeFile(wb, 'duplicados.xlsx');
}

export function exportPronostico(scenarios: ForecastScenario[]) {
  const data = scenarios.map((s) => ({
    Escenario: s.escenario,
    'Base de Cálculo': s.baseCalculo,
    'Saldo Disponible': s.saldoDisponible,
    'Consumo Diario': s.consumoDiario,
    'Consumo Semanal': s.consumoSemanal,
    'Consumo Mensual': s.consumoMensual,
    'Días Restantes': s.diasRestantes,
    'Semanas Restantes': s.semanasRestantes,
    'Meses Restantes': s.mesesRestantes,
    'Fecha Estimada Agotamiento': s.fechaEstimada ? s.fechaEstimada.toISOString().slice(0, 10) : 'N/A',
    'Nivel de Riesgo': s.nivelRiesgo.toUpperCase(),
    Observación: s.observacion,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pronóstico');
  XLSX.writeFile(wb, 'pronostico_agotamiento.xlsx');
}

export function exportResumenEjecutivo(
  summary: FinancialSummary,
  config: PrepurchaseConfig,
  scenarios: ForecastScenario[]
) {
  const wb = XLSX.utils.book_new();

  // KPI sheet
  const kpiData = [
    { Indicador: 'Valor de Precompra', Valor: formatCOP(config.valorPrecompra) },
    { Indicador: 'Porcentaje Adicional', Valor: formatPct(config.porcentajeAdicional) },
    { Indicador: 'Cupo Comercial Total', Valor: formatCOP(summary.cupoTotal) },
    { Indicador: 'Venta Bruta Efectiva', Valor: formatCOP(summary.ventaBrutaEfectiva) },
    { Indicador: 'Over-Commission Efectiva', Valor: formatCOP(summary.overCommissionEfectiva) },
    { Indicador: 'Consumo Neto', Valor: formatCOP(summary.consumoNeto) },
    { Indicador: 'Saldo Comercial Disponible', Valor: formatCOP(summary.saldoComercialDisponible) },
    { Indicador: 'Saldo Neto Contra Prepago', Valor: formatCOP(summary.saldoNetoContraPrepago) },
    { Indicador: 'Porcentaje Consumido', Valor: formatPct(summary.porcentajeConsumido) },
    { Indicador: 'Porcentaje Disponible', Valor: formatPct(summary.porcentajeDisponible) },
    { Indicador: 'Reservas Efectivas', Valor: summary.numReservasEfectivas },
    { Indicador: 'Reservas Canceladas', Valor: summary.numReservasCanceladas },
    { Indicador: 'Duplicados', Valor: summary.numDuplicados },
    { Indicador: 'En Revisión', Valor: summary.numEnRevision },
    { Indicador: 'Ticket Promedio', Valor: formatCOP(summary.ticketPromedio) },
    { Indicador: 'Promedio Diario', Valor: formatCOP(summary.promedioDiario) },
    { Indicador: 'Promedio Semanal', Valor: formatCOP(summary.promedioSemanal) },
    { Indicador: 'Promedio Mensual', Valor: formatCOP(summary.promedioMensual) },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiData), 'KPIs');

  // Forecast sheet
  const fData = scenarios.map((s) => ({
    Escenario: s.escenario,
    'Saldo Disponible': s.saldoDisponible,
    'Consumo Diario': s.consumoDiario,
    'Días Restantes': s.diasRestantes,
    'Fecha Estimada': s.fechaEstimada?.toISOString().slice(0, 10) ?? 'N/A',
    'Riesgo': s.nivelRiesgo.toUpperCase(),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fData), 'Pronóstico');

  XLSX.writeFile(wb, 'resumen_ejecutivo_precompra.xlsx');
}
