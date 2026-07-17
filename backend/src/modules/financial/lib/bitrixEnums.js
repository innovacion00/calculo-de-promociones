// Catálogos compartidos de campos enumeration del CRM Bitrix24. Port de src/lib/bitrixEnums.ts.
// Los IDs de opción son específicos de la cuenta y se comparten entre pipelines de deal.

/** @type {Record<string, string>} */
export const HOTEL_ENUM = {
  '5272': 'Hotel Marina Suites',
  '5274': 'Hotel Avexi Suites',
  '12644': 'Hotel Axis Inn',
  '5276': 'Hotel Azuan Suites',
  '5278': 'Hotel Bocagrande',
  '5280': 'Hotel Abi Inn',
  '5282': 'Hotel Aixo Suites',
  '5284': 'Hotel Boquilla Suites',
  '5290': 'Hotel Madisson Inn',
  '5292': 'Hotel Windsor House',
  '5294': 'Hotel Rodadero Inn',
  '12740': 'Hotel Sansiraka Inn',
  '13676': 'Hotel Playa Salguero',
  '13802': 'Hotel El Marques',
};

/** @type {Record<string, string>} */
export const BANK_ENUM = {
  '5206': 'Bancolombia',
  '5208': 'Davivienda',
  '5210': 'Otros',
  '5212': 'Paypal',
  '5214': 'Payu',
  '5216': 'Colpatria',
  '12604': 'Cobre',
};

/**
 * @param {Record<string, string>} map
 * @returns {Record<string, string>}
 */
function invert(map) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [id, name] of Object.entries(map)) out[name] = id;
  return out;
}

export const HOTEL_NAME_TO_ID = invert(HOTEL_ENUM);
export const BANK_NAME_TO_ID = invert(BANK_ENUM);

/** @returns {string[]} */
export function getHotelOptions() {
  return Object.values(HOTEL_ENUM).sort();
}

/** @returns {string[]} */
export function getBankOptions() {
  return Object.values(BANK_ENUM).sort();
}
