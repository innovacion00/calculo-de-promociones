import * as XLSX from 'xlsx';
import { ReconciliationResult, ReconciliationConfig } from './reconciliationEngine';
import { HotelMapping } from './hotelNormalizer';

export function exportReconciliation(
  result: ReconciliationResult,
  _hotelMapping: HotelMapping,
  _config: ReconciliationConfig
): void {
  const wb = XLSX.utils.book_new();

  // Master table sheet
  const masterHeader = [
    'ID',
    'En Price',
    'En GEH',
    'Estado Price',
    'Hotel Price',
    'Hotel Price Norm.',
    'Hotel GEH',
    'Huésped Price',
    'Huésped GEH',
    'Fecha Llegada Price',
    'Check-In GEH',
    'Check-Out GEH',
    'Bruto Price',
    'Over-Comm Price',
    'Neto Price',
    'Valor GEH',
    'Diferencia',
    'Dif. %',
    'Estado Conciliación',
    'Observación Auto',
    'Recomendación',
    'Notas GEH',
  ];

  const masterData = result.masterTable.map((r) => [
    r.id,
    r.existsInPrice ? 'Sí' : 'No',
    r.existsInGEH ? 'Sí' : 'No',
    r.priceStatus,
    r.priceHotel,
    r.priceHotelNormalized,
    r.gehHotel,
    r.priceGuest,
    r.gehGuest,
    r.priceArrival ? r.priceArrival.toLocaleDateString('es-CO') : '',
    r.gehCheckIn ? r.gehCheckIn.toLocaleDateString('es-CO') : '',
    r.gehCheckOut ? r.gehCheckOut.toLocaleDateString('es-CO') : '',
    r.priceBruto,
    r.priceOverComm,
    r.priceNeto,
    r.gehAmount,
    r.valueDiff,
    r.valueDiffPct.toFixed(1) + '%',
    r.reconciliationStatus,
    r.autoObservation,
    r.recommendation,
    r.gehNotes,
  ]);

  const masterWs = XLSX.utils.aoa_to_sheet([masterHeader, ...masterData]);
  XLSX.utils.book_append_sheet(wb, masterWs, 'Conciliación Maestra');

  // Summary sheet
  const s = result.summary;
  const summaryData = [
    ['Métrica', 'Valor'],
    ['Total IDs Price', s.totalPrice],
    ['Total IDs GEH', s.totalGEH],
    ['Conciliadas', s.conciliadas],
    ['Price no en GEH', s.priceNotGEH],
    ['GEH no en Price', s.gehNotPrice],
    ['Diferencia de Valor', s.diffValor],
    ['Diferencia de Hotel', s.diffHotel],
    ['Diferencia de Fecha', s.diffFecha],
    ['Diferencia de Huésped', s.diffHuesped],
    ['Canceladas Price / Activas GEH', s.cancelledPriceActiveGEH],
    ['Duplicados Price', s.duplicadosPrice],
    ['Duplicados GEH', s.duplicadosGEH],
    ['Valor dif. favor Price', s.valorDiffFavorPrice],
    ['Valor dif. favor GEH', s.valorDiffFavorGEH],
    ['Hotel con más diferencias', s.hotelMasDiferencias],
    ['IDs inválidos Price', s.invalidIdsPrice],
    ['IDs inválidos GEH', s.invalidIdsGEH],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

  // Price not in GEH
  const pngHeader = ['ID', 'Hotel Price', 'Hotel Norm.', 'Huésped', 'Fecha Llegada', 'Bruto', 'Over-Comm', 'Neto', 'Estado', 'Recomendación'];
  const pngRows = result.masterTable
    .filter((r) => r.reconciliationStatus === 'PRICE_NOT_GEH')
    .map((r) => [
      r.id, r.priceHotel, r.priceHotelNormalized, r.priceGuest,
      r.priceArrival ? r.priceArrival.toLocaleDateString('es-CO') : '',
      r.priceBruto, r.priceOverComm, r.priceNeto, r.priceStatus, r.recommendation,
    ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([pngHeader, ...pngRows]), 'Price no en GEH');

  // GEH not in Price
  const gnpHeader = ['ID', 'Hotel GEH', 'Huésped GEH', 'Check-In', 'Check-Out', 'Valor GEH', 'Notas', 'Recomendación'];
  const gnpRows = result.masterTable
    .filter((r) => r.reconciliationStatus === 'GEH_NOT_PRICE')
    .map((r) => [
      r.id, r.gehHotel, r.gehGuest,
      r.gehCheckIn ? r.gehCheckIn.toLocaleDateString('es-CO') : '',
      r.gehCheckOut ? r.gehCheckOut.toLocaleDateString('es-CO') : '',
      r.gehAmount, r.gehNotes, r.recommendation,
    ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([gnpHeader, ...gnpRows]), 'GEH no en Price');

  XLSX.writeFile(wb, `conciliacion_price_geh_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
