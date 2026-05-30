import * as XLSX from 'xlsx';
import { UniversalParseResult } from './universalParser';
import { CrossResult } from './crossEngine';

export function exportCrossResult(
  priceResult: UniversalParseResult,
  gehResult: UniversalParseResult,
  crossResult: CrossResult
): void {
  const wb = XLSX.utils.book_new();
  const { summary, masterTable, duplicates } = crossResult;

  // Sheet 1: Resumen General
  const resumenData = [
    ['Conciliación Avanzada — Resumen General'],
    [],
    ['Métrica', 'Valor'],
    ['Filas en Price', summary.totalPrice],
    ['Filas en GEH Suites', summary.totalGEH],
    ['Coincidentes', summary.coincidentes],
    ['En Price, no en GEH', summary.enPriceNoGEH],
    ['En GEH, no en Price', summary.enGEHNoPrice],
    ['Duplicados Price', summary.duplicadosPrice],
    ['Duplicados GEH', summary.duplicadosGEH],
    ['% Coincidencia', `${summary.pctCoincidencia.toFixed(1)}%`],
    ['% Diferencia', `${summary.pctDiferencia.toFixed(1)}%`],
    ['Valor Coincidentes', summary.valorCoincidentes],
    ['Valor Price no GEH', summary.valorEnPriceNoGEH],
    ['Valor GEH no Price', summary.valorEnGEHNoPrice],
    ['Valor Total Diferencias', summary.valorTotalDiferencias],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenData), 'Resumen General');

  // Sheet 2: Diferencias
  const difHeaders = ['Tipo', 'Origen', 'ID/Localizador', 'Nombre', 'Valor', 'Fecha', 'Observaciones'];
  const difRows = masterTable.map((r) => [
    r.differenceType, r.origin, r.id, r.name, r.value, r.dateStr, r.observations,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([difHeaders, ...difRows]), 'Diferencias');

  // Sheet 3: Price no en GEH
  const priceNoGEH = masterTable.filter((r) => r.differenceType === 'IN_PRICE_NOT_GEH');
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([difHeaders, ...priceNoGEH.map((r) => [r.differenceType, r.origin, r.id, r.name, r.value, r.dateStr, r.observations])]),
    'Price no en GEH'
  );

  // Sheet 4: GEH no en Price
  const gehNoPrice = masterTable.filter((r) => r.differenceType === 'IN_GEH_NOT_PRICE');
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([difHeaders, ...gehNoPrice.map((r) => [r.differenceType, r.origin, r.id, r.name, r.value, r.dateStr, r.observations])]),
    'GEH no en Price'
  );

  // Sheet 5: Coincidentes
  const coinHeaders = ['ID', 'Nombre Price', 'Nombre GEH', 'Valor Price', 'Valor GEH', 'Fecha Price', 'Fecha GEH'];
  const coin = masterTable.filter((r) => r.differenceType === 'COINCIDE');
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([coinHeaders, ...coin.map((r) => [r.id, r.priceName ?? '', r.gehName ?? '', r.priceValue ?? 0, r.gehValue ?? 0, r.priceDateStr ?? '', r.gehDateStr ?? ''])]),
    'Coincidentes'
  );

  // Sheet 6: Duplicados
  const dupHeaders = ['Archivo', 'ID', 'Veces', 'Nombres', 'Valor Acumulado'];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([dupHeaders, ...duplicates.map((d) => [d.source, d.id, d.count, d.names.join(', '), d.totalValue])]),
    'Duplicados'
  );

  // Sheet 7: Parámetros
  const paramData = [
    ['Parámetros de la Conciliación'],
    [],
    ['Archivo Price — Hoja', priceResult.sheetNames[0]],
    ['Archivo Price — Columnas', priceResult.headers.join(', ')],
    ['Archivo Price — Columna ID', priceResult.detectedColumns.id?.header ?? 'N/A'],
    ['Archivo GEH — Hoja', gehResult.sheetNames[0]],
    ['Archivo GEH — Columnas', gehResult.headers.join(', ')],
    ['Archivo GEH — Columna ID', gehResult.detectedColumns.id?.header ?? 'N/A'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(paramData), 'Parámetros');

  XLSX.writeFile(wb, 'conciliacion_avanzada.xlsx');
}
