// Datos estáticos del Simulador de Tarifas. Port literal de index.html (HOTEL_MIN_RATES,
// HOTEL_ROOM_TYPES, CHANNELS) — mismos valores, misma estructura. No mutar este módulo:
// el estado editable por hotel vive aparte (ver lib/simulator/config.js).

/** Tarifa mínima permitida por hotel (para la alerta visual en las tablas). */
export const HOTEL_MIN_RATES = {
  'Hotel Madison Inn': 170000,
  'Hotel Windsor House': 170000,
  'Hotel Aixo Suites': 170000,
  'Hotel Abi Inn': 140000,
  'Hotel Marina Suites': 105000,
  'Hotel Azuan Suites': 105000,
  'Hotel Avexi Suites': 105000,
  'Hotel Boquilla Suites': 70000,
  'Hotel El Marques': 500000,
  'Hotel El Marqués': 500000,
  'Hotel Sansiraka': 100000,
  'Hotel Axis Inn': 80000,
  'Hotel Rodadero Inn': 90000,
  'Hotel Playa Salguero': 70000,
};

/** Tipos de habitación y tarifa base por hotel. @type {Record<string, {name: string, base: number}[]>} */
export const HOTEL_ROOM_TYPES = {
  'Hotel Madison Inn': [
    { name: 'Doble Estándar', base: 200000 }, { name: 'Superior con Terraza', base: 210000 },
    { name: 'Suite Business', base: 240000 }, { name: 'Ejecutiva Twin', base: 260000 },
    { name: 'Familiar Triple', base: 320000 }, { name: 'Familiar Cuádruple', base: 380000 },
    { name: 'Apartamento superior', base: 305000 }, { name: 'Apartamento duplex', base: 567470 },
  ],
  'Hotel Aixo Suites': [
    { name: 'Doble Ciudad', base: 240000 }, { name: 'Doble Mar', base: 290000 },
    { name: 'Cuádruple Ciudad', base: 340000 }, { name: 'Cuádruple Mar', base: 390000 },
  ],
  'Hotel Axis Inn': [
    { name: 'Doble', base: 100000 }, { name: 'Triple', base: 160000 },
    { name: 'Cuádruple', base: 220000 }, { name: 'Quíntuple', base: 280000 },
  ],
  'Hotel Rodadero Inn': [
    { name: 'Doble', base: 110000 }, { name: 'Triple', base: 170000 }, { name: 'Cuádruple', base: 230000 },
  ],
  'Hotel Abi Inn': [
    { name: 'Doble', base: 200000 }, { name: 'Triple', base: 300000 },
    { name: 'Cuádruple', base: 380000 }, { name: 'Quíntuple', base: 420000 },
  ],
  'Hotel Windsor House': [
    { name: 'Doble Superior', base: 225000 }, { name: 'Doble Twin', base: 235000 },
    { name: 'Junior Doble', base: 250000 }, { name: 'Triple', base: 300000 },
  ],
  'Hotel Boquilla Suites': [
    { name: 'Doble', base: 92000 }, { name: 'Cuádruple', base: 238000 }, { name: 'Séxtuple', base: 338000 },
  ],
  'Hotel Marina Suites': [
    { name: 'Doble Estándar', base: 150000 }, { name: 'Cuádruple Estándar', base: 290000 },
  ],
  'Hotel Avexi Suites': [
    { name: 'Doble Estándar', base: 150000 }, { name: 'Cuádruple Estándar', base: 290000 },
  ],
  'Hotel Azuan Suites': [
    { name: 'Doble Estándar', base: 150000 }, { name: 'Cuádruple Estándar', base: 290000 },
  ],
  'Hotel Sansiraka': [
    { name: 'Doble Estándar', base: 136000 }, { name: 'Doble Twin', base: 150000 },
    { name: 'Triple', base: 196000 }, { name: 'Cuádruple Estándar', base: 256000 },
    { name: 'Junior Suite', base: 256000 }, { name: 'Quíntuple', base: 316000 },
  ],
  'Hotel Playa Salguero': [
    { name: 'Doble', base: 85000 }, { name: 'Triple', base: 145000 },
    { name: 'Cuádruple', base: 205000 }, { name: 'Quíntuple', base: 265000 },
  ],
  'Hotel El Marques': [
    { name: 'Deluxe', base: 600000 }, { name: 'Junior Suite', base: 750000 },
    { name: 'Suite', base: 900000 }, { name: 'Familiar', base: 1100000 },
  ],
  'Hotel El Marqués': [
    { name: 'Deluxe', base: 600000 }, { name: 'Junior Suite', base: 750000 },
    { name: 'Suite', base: 900000 }, { name: 'Familiar', base: 1100000 },
  ],
};

// ── Filas por canal (helpers de construcción, port literal) ────────────────

/** @param {string} base @param {boolean} withCupos */
function despRows(base, withCupos) {
  const rows = [
    { label: 'Opaco · Descuento 15%', base, discounts: [0.15, 0], planPct: 15 },
    { label: 'Opaco + mercado país · 15%', base, discounts: [0.15, 0], planPct: 15, promoAdd: 0.05 },
    { label: 'Paquete dinámico · 22%', base, discounts: [0.22, 0], planPct: 22 },
    { label: 'Paquete + mercado país · 22%', base, discounts: [0.22, 0], planPct: 22, promoAdd: 0.05 },
    { label: 'Canal B2B · 16%', base, discounts: [0.16, 0], planPct: 16 },
    { label: 'B2B + mercado país · 16%', base, discounts: [0.16, 0], planPct: 16, promoAdd: 0.05 },
  ];
  if (withCupos) {
    rows.push({ label: 'Cupos / allotment · 31%', base, discounts: [0.31, 0], planPct: 31 });
    rows.push({ label: 'Cupos + mercado país · 31%', base, discounts: [0.31, 0], planPct: 31, promoAdd: 0.05 });
  }
  return rows;
}
const despHdrs = ['Estrategia', 'Base OTA', 'Neto', 'Sugerida OTA ▼', 'Ingreso ▼'];

/** @param {string} base */
function expRows(base) {
  return [
    { label: 'Tarifa Base', base, discounts: [0], planPct: 0 },
    { label: 'Tarifa Base + Mem', base, discounts: [0], planPct: 0, promoAdd: 0.10 },
    { label: 'Package (−10%)', base, discounts: [0.10, 0], planPct: 10 },
    { label: 'Package + Mem', base, discounts: [0.10, 0], planPct: 10, promoAdd: 0.10 },
    { label: 'Móvil (−10%)', base, discounts: [0.10, 0], planPct: 10 },
    { label: 'Móvil + Mem', base, discounts: [0.10, 0], planPct: 10, promoAdd: 0.10 },
    { label: 'País (−5%)', base, discounts: [0.05, 0], planPct: 5 },
    { label: 'País + Mem', base, discounts: [0.05, 0], planPct: 5, promoAdd: 0.10 },
  ];
}
const expHdrs = ['Plan', 'Base', 'Mod. Canal', 'Promo', 'Sugerida OTA ▼', 'Ingreso ▼'];

function bookRows() {
  return [
    { label: 'Tarifa Estándar', base: 'std', discounts: [0, 0.20], promoIdx: 0 },
    { label: 'No Reembolsable', base: 'nr', discounts: [0, 0.20], promoIdx: 0 },
    { label: 'Mín 2 noches', base: 'min2', discounts: [0, 0.20], promoIdx: 0 },
    { label: 'Mín 3 noches', base: 'min3', discounts: [0, 0.20], promoIdx: 0 },
    { label: 'Tarifa Semanal', base: 'sem', discounts: [0, 0.20], promoIdx: 0 },
  ];
}
const bookHdrs = ['Estrategia', 'Base OTA', 'Después promo', 'GENIUS ▼', 'MOBILE ▼', 'Ingreso ▼'];

function ptRowsSin() {
  return [
    { label: 'Breakfast Plan', base: 'std', discounts: [0], planPct: 0 },
    { label: 'Non-refundable', base: 'nr', discounts: [0], planPct: 0 },
    { label: 'PKG 18%', base: 'std', discounts: [0.18, 0], planPct: 18 },
    { label: 'PKG 18% + NR', base: 'std', discounts: [0.30, 0], planPct: 30 },
    { label: 'B2B 20%', base: 'std', discounts: [0.20, 0], planPct: 20 },
    { label: 'B2B 20% + NR', base: 'std', discounts: [0.32, 0], planPct: 32 },
    { label: 'Cupos 27%', base: 'std', discounts: [0.27, 0], planPct: 27 },
    { label: 'Cupos 27% + NR', base: 'std', discounts: [0.39, 0], planPct: 39 },
  ];
}
function ptRowsCon() {
  return [
    { label: 'Breakfast Plan', base: 'stdC', discounts: [0], planPct: 0 },
    { label: 'Non-refundable', base: 'nrC', discounts: [0], planPct: 0 },
    { label: 'PKG 18%', base: 'stdC', discounts: [0.18, 0], planPct: 18 },
    { label: 'PKG 18% + NR', base: 'stdC', discounts: [0.30, 0], planPct: 30 },
    { label: 'B2B 20%', base: 'stdC', discounts: [0.20, 0], planPct: 20 },
    { label: 'B2B 20% + NR', base: 'stdC', discounts: [0.32, 0], planPct: 32 },
    { label: 'Cupos 27%', base: 'stdC', discounts: [0.27, 0], planPct: 27 },
    { label: 'Cupos 27% + NR', base: 'stdC', discounts: [0.39, 0], planPct: 39 },
  ];
}

const hotelbedsColHeaders = ['Estrategia', 'Base OTA', 'Promo+Noches', 'Opaque 10%', 'Sugerida OTA ▼', 'Ingreso ▼'];
function hotelbedsRows() {
  return [
    { label: 'Estándar', base: 'std', discounts: [0, 0.10], promoIdx: 0 },
    { label: 'No reembolsable', base: 'nr', discounts: [0, 0.10], promoIdx: 0 },
    { label: 'Mín. 2 noches Std (+2%)', base: 'std', discounts: [0, 0.10], promoIdx: 0, nocheAdd: 0.02 },
    { label: 'Mín. 2 noches NR (+2%)', base: 'nr', discounts: [0, 0.10], promoIdx: 0, nocheAdd: 0.02 },
    { label: 'Mín. 3 noches Std (+4%)', base: 'std', discounts: [0, 0.10], promoIdx: 0, nocheAdd: 0.04 },
    { label: 'Mín. 3 noches NR (+4%)', base: 'nr', discounts: [0, 0.10], promoIdx: 0, nocheAdd: 0.04 },
  ];
}

function threeStepRows() {
  return [
    { label: 'Estándar', base: 'std', discounts: [0] },
    { label: 'Mín. 2 noches', base: 'min2', discounts: [0] },
    { label: 'Mín. 3 noches', base: 'min3', discounts: [0] },
  ];
}

// ── CHANNELS ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} PlanRow
 * @property {string} label
 * @property {string|number} base
 * @property {number[]} discounts
 * @property {number} [planPct]
 * @property {number} [promoAdd]
 * @property {number} [nocheAdd]
 * @property {number} [promoIdx]
 */

/**
 * @typedef {Object} Section
 * @property {string} [_id]  se asigna en tiempo de carga (ver bucle más abajo), no en el literal
 * @property {string} title
 * @property {number} promoDefault
 * @property {string[]} [colHeaders]
 * @property {number} [pairGroup]
 * @property {boolean} [ptMerged]
 * @property {PlanRow[]} [rows]
 * @property {PlanRow[]} [rowsSin]
 * @property {PlanRow[]} [rowsCon]
 * @property {{ showOta?: boolean, showMobile?: boolean, showNet?: boolean }} [colConfig]
 */

/**
 * @typedef {Object} Channel
 * @property {string} key
 * @property {string} name
 * @property {string} color
 * @property {number} [gridCols]
 * @property {number} factor
 * @property {number} commission
 * @property {boolean} [priceTravel]
 * @property {string[]} baseLabels
 * @property {string[]} baseKeys
 * @property {(number|null)[]} baseFactors
 * @property {Section[]} sections
 * @property {number[]} [geniusPcts]
 * @property {number} [geniusPct]
 * @property {number} [mobilePct]
 */

/** @type {Channel[]} */
export const CHANNELS_BASE = [
  /* DESPEGAR */
  {
    key: 'despegar', name: 'Despegar', color: '#0070b8', gridCols: 4,
    factor: 2.49, commission: 0.23,
    baseLabels: ['Tarifa estándar', 'No reembolsable', 'Mínimo 2 noches', 'Mínimo 3 noches'],
    baseKeys: ['std', 'nr', 'min2', 'min3'],
    baseFactors: [1, 0.88, 0.86, 0.84],
    sections: [
      { title: 'OPACA · Estándar', promoDefault: 43, colHeaders: [...despHdrs], pairGroup: 2, rows: despRows('std', false) },
      { title: 'OPACA · No reembolsable', promoDefault: 43, colHeaders: [...despHdrs], pairGroup: 2, rows: despRows('nr', true) },
      { title: 'OPACA · Mín. 2 noches', promoDefault: 43, colHeaders: [...despHdrs], pairGroup: 2, rows: despRows('min2', true) },
      { title: 'OPACA · Mín. 3 noches', promoDefault: 43, colHeaders: [...despHdrs], pairGroup: 2, rows: despRows('min3', true) },
      { title: 'COMPRA ANTICIPADA 90D · Estándar', promoDefault: 42, colHeaders: [...despHdrs], pairGroup: 2, rows: despRows('std', false) },
      { title: 'COMPRA ANTICIPADA 90D · No reembolsable', promoDefault: 42, colHeaders: [...despHdrs], pairGroup: 2, rows: despRows('nr', true) },
      { title: 'COMPRA ANTICIPADA 90D · Mín. 2 noches', promoDefault: 42, colHeaders: [...despHdrs], pairGroup: 2, rows: despRows('min2', true) },
      { title: 'COMPRA ANTICIPADA 90D · Mín. 3 noches', promoDefault: 42, colHeaders: [...despHdrs], pairGroup: 2, rows: despRows('min3', true) },
      { title: 'PROMO GENERAL · Estándar', promoDefault: 36, colHeaders: [...despHdrs], pairGroup: 2, rows: despRows('std', false) },
      { title: 'PROMO GENERAL · No reembolsable', promoDefault: 36, colHeaders: [...despHdrs], pairGroup: 2, rows: despRows('nr', true) },
      { title: 'PROMO GENERAL · Mín. 2 noches', promoDefault: 36, colHeaders: [...despHdrs], pairGroup: 2, rows: despRows('min2', true) },
      { title: 'PROMO GENERAL · Mín. 3 noches', promoDefault: 36, colHeaders: [...despHdrs], pairGroup: 2, rows: despRows('min3', true) },
    ],
  },

  /* EXPEDIA */
  {
    key: 'expedia', name: 'Expedia', color: '#1b3a6b', gridCols: 4,
    factor: 2.49, commission: 0.22,
    baseLabels: ['Tarifa estándar', 'No reembolsable', 'Mínimo 2 noches', 'Mínimo 3 noches'],
    baseKeys: ['std', 'nr', 'min2', 'min3'],
    baseFactors: [1, 0.88, 0.86, 0.84],
    sections: [
      { title: 'PROMO GENERAL · Estándar', promoDefault: 36, colHeaders: [...expHdrs], pairGroup: 2, rows: expRows('std') },
      { title: 'PROMO GENERAL · No reembolsable', promoDefault: 36, colHeaders: [...expHdrs], pairGroup: 2, rows: expRows('nr') },
      { title: 'PROMO GENERAL · Mín. 2 noches', promoDefault: 36, colHeaders: [...expHdrs], pairGroup: 2, rows: expRows('min2') },
      { title: 'PROMO GENERAL · Mín. 3 noches', promoDefault: 36, colHeaders: [...expHdrs], pairGroup: 2, rows: expRows('min3') },
      { title: 'COMPRA ANTICIPADA 60D · Estándar', promoDefault: 40, colHeaders: [...expHdrs], pairGroup: 2, rows: expRows('std') },
      { title: 'COMPRA ANTICIPADA 60D · No reembolsable', promoDefault: 40, colHeaders: [...expHdrs], pairGroup: 2, rows: expRows('nr') },
      { title: 'COMPRA ANTICIPADA 60D · Mín. 2 noches', promoDefault: 40, colHeaders: [...expHdrs], pairGroup: 2, rows: expRows('min2') },
      { title: 'COMPRA ANTICIPADA 60D · Mín. 3 noches', promoDefault: 40, colHeaders: [...expHdrs], pairGroup: 2, rows: expRows('min3') },
    ],
  },

  /* PRICE TRAVEL */
  {
    key: 'pricetravel', name: 'Price Travel', color: '#c0392b',
    factor: 1.8675, commission: 0,
    priceTravel: true,
    baseLabels: ['Estándar SIN COMI', 'NR SIN COMI −12%', 'Estándar CON COMI ÷0.75', 'NR CON COMI'],
    baseKeys: ['std', 'nr', 'stdC', 'nrC'],
    baseFactors: [1, 0.88, null, null],
    sections: [
      { title: 'PROMO GENERAL', promoDefault: 36, ptMerged: true, pairGroup: 2, rowsSin: ptRowsSin(), rowsCon: ptRowsCon() },
      { title: 'ANTICIPADA 60d', promoDefault: 40, ptMerged: true, pairGroup: 2, rowsSin: ptRowsSin(), rowsCon: ptRowsCon() },
      { title: 'ESPECIAL', promoDefault: 43, ptMerged: true, pairGroup: 2, rowsSin: ptRowsSin(), rowsCon: ptRowsCon() },
      { title: 'CAMPAÑA', promoDefault: 49, ptMerged: true, pairGroup: 2, rowsSin: ptRowsSin(), rowsCon: ptRowsCon() },
    ],
  },

  /* HOTELBEDS */
  {
    key: 'hotelbeds', name: 'HotelBeds', color: '#007a74',
    factor: 2.49, commission: 0.20,
    baseLabels: ['Tarifa estándar', 'No reembolsable'],
    baseKeys: ['std', 'nr'],
    baseFactors: [1, 0.88],
    sections: [
      { title: 'CAMPAÑA GETAWAY', promoDefault: 43, colHeaders: [...hotelbedsColHeaders], pairGroup: 2, rows: hotelbedsRows() },
      { title: 'OPACA', promoDefault: 36, colHeaders: [...hotelbedsColHeaders], pairGroup: 2, rows: hotelbedsRows() },
      { title: 'COMPRA ANTICIPADA 90 DÍAS', promoDefault: 35, colHeaders: [...hotelbedsColHeaders], pairGroup: 2, rows: hotelbedsRows() },
      { title: 'PROMO GENERAL', promoDefault: 29, colHeaders: [...hotelbedsColHeaders], pairGroup: 2, rows: hotelbedsRows() },
    ],
  },

  /* EDREAMS */
  {
    key: 'edreams', name: 'eDreams', color: '#4a148c',
    factor: 2.49, commission: 0.20,
    baseLabels: ['Tarifa estándar', 'No reembolsable', 'Mínimo 2 noches', 'Mínimo 3 noches'],
    baseKeys: ['std', 'nr', 'min2', 'min3'],
    baseFactors: [1, 0.88, 0.86, 0.84],
    sections: [
      { title: 'CAMPAÑA · Sin Prime', promoDefault: 43, colHeaders: ['Estrategia', 'Base OTA', 'Campaña', 'Sugerida OTA ▼', 'Ingreso ▼'], rows: threeStepRows() },
      { title: 'CAMPAÑA · Con Prime (+10%)', promoDefault: 53, colHeaders: ['Estrategia', 'Base OTA', 'Campaña+Prime', 'Sugerida OTA ▼', 'Ingreso ▼'], rows: threeStepRows() },
      { title: 'OPACA · Sin Prime', promoDefault: 36, colHeaders: ['Estrategia', 'Base OTA', 'Opaca', 'Sugerida OTA ▼', 'Ingreso ▼'], rows: threeStepRows() },
      { title: 'OPACA · Con Prime (+10%)', promoDefault: 46, colHeaders: ['Estrategia', 'Base OTA', 'Opaca+Prime', 'Sugerida OTA ▼', 'Ingreso ▼'], rows: threeStepRows() },
      { title: 'COMPRA ANTICIPADA 90D · Sin Prime', promoDefault: 35, colHeaders: ['Estrategia', 'Base OTA', 'Anti. 90d', 'Sugerida OTA ▼', 'Ingreso ▼'], rows: threeStepRows() },
      { title: 'COMPRA ANTICIPADA 90D · Con Prime', promoDefault: 45, colHeaders: ['Estrategia', 'Base OTA', 'Anti+Prime', 'Sugerida OTA ▼', 'Ingreso ▼'], rows: threeStepRows() },
      { title: 'PROMO GENERAL · Sin Prime', promoDefault: 29, colHeaders: ['Estrategia', 'Base OTA', 'Promo', 'Sugerida OTA ▼', 'Ingreso ▼'], rows: threeStepRows() },
      { title: 'PROMO GENERAL · Con Prime', promoDefault: 39, colHeaders: ['Estrategia', 'Base OTA', 'Promo+Prime', 'Sugerida OTA ▼', 'Ingreso ▼'], rows: threeStepRows() },
    ],
  },

  /* BRAND.COM */
  {
    key: 'brandcom', name: 'Brand.com', color: '#0d7c3d',
    factor: 2.49, commission: 0,
    baseLabels: ['Tarifa estándar', 'No reembolsable'],
    baseKeys: ['std', 'nr'],
    baseFactors: [1, 0.88],
    sections: [
      { title: 'CAMPAÑA · Sin Prime', promoDefault: 43, colHeaders: ['Estrategia', 'Base OTA', 'Campaña', 'Sugerida OTA ▼'], rows: [{ label: 'Estándar', base: 'std', discounts: [0] }] },
      { title: 'CAMPAÑA · Con Prime (+10%)', promoDefault: 53, colHeaders: ['Estrategia', 'Base OTA', 'Campaña+Prime', 'Sugerida OTA ▼'], rows: [{ label: 'Estándar', base: 'std', discounts: [0] }] },
      { title: 'OPACA · Sin Prime', promoDefault: 36, colHeaders: ['Estrategia', 'Base OTA', 'Opaca', 'Sugerida OTA ▼'], rows: [{ label: 'Estándar', base: 'std', discounts: [0] }] },
      { title: 'OPACA · Con Prime (+10%)', promoDefault: 46, colHeaders: ['Estrategia', 'Base OTA', 'Opaca+Prime', 'Sugerida OTA ▼'], rows: [{ label: 'Estándar', base: 'std', discounts: [0] }] },
      { title: 'COMPRA ANTICIPADA 90D · Sin Prime', promoDefault: 35, colHeaders: ['Estrategia', 'Base OTA', 'Anti. 90d', 'Sugerida OTA ▼'], rows: [{ label: 'Estándar', base: 'std', discounts: [0] }] },
      { title: 'COMPRA ANTICIPADA 90D · Con Prime', promoDefault: 45, colHeaders: ['Estrategia', 'Base OTA', 'Anti+Prime', 'Sugerida OTA ▼'], rows: [{ label: 'Estándar', base: 'std', discounts: [0] }] },
      { title: 'PROMO GENERAL · Sin Prime', promoDefault: 29, colHeaders: ['Estrategia', 'Base OTA', 'Promo', 'Sugerida OTA ▼'], rows: [{ label: 'Estándar', base: 'std', discounts: [0] }] },
      { title: 'PROMO GENERAL · Con Prime', promoDefault: 39, colHeaders: ['Estrategia', 'Base OTA', 'Promo+Prime', 'Sugerida OTA ▼'], rows: [{ label: 'Estándar', base: 'std', discounts: [0] }] },
    ],
  },

  /* BOOKING */
  {
    key: 'booking', name: 'Booking.com', color: '#003580',
    factor: 2.49, commission: 0.15,
    geniusPcts: [10, 15, 20],
    geniusPct: 20,
    mobilePct: 10,
    baseLabels: ['Tarifa Estándar', 'No reembolsable', 'Mínimo 2 noches', 'Mínimo 3 noches', 'Tarifa Semanal'],
    baseKeys: ['std', 'nr', 'min2', 'min3', 'sem'],
    baseFactors: [1, 0.88, 0.86, 0.84, 0.82],
    sections: [
      { title: 'CAMPAÑA GETAWAY', promoDefault: 40, colHeaders: bookHdrs, rows: bookRows() },
      { title: 'OCULTA', promoDefault: 36, colHeaders: bookHdrs, rows: bookRows() },
      { title: 'ANTICIPADA 90 DÍAS', promoDefault: 35, colHeaders: bookHdrs, rows: bookRows() },
      { title: 'PROMO GENERAL', promoDefault: 29, colHeaders: bookHdrs, rows: bookRows() },
    ],
  },
];

// Asigna un _id único a cada sección por defecto (una sola vez al cargar el módulo).
let _secIdCounter = 0;
CHANNELS_BASE.forEach((ch) => ch.sections.forEach((sec) => { sec._id = `s${++_secIdCounter}`; }));

/** Próximo _id disponible para secciones creadas en tiempo de ejecución (copiar/nueva estrategia). */
export function nextSectionId() {
  return `s${++_secIdCounter}`;
}

/** Hoteles cuyas secciones ptMerged de Price Travel se muestran en tarjeta normal (no ancho completo). */
export const PT_NON_FULL_HOTELS = new Set([
  'Hotel Madison Inn', 'Hotel Aixo Suites', 'Hotel Axis Inn', 'Hotel Rodadero Inn',
]);
