// Catálogos compartidos de campos personalizados (enumeration) del CRM de Bitrix24.
// Los IDs de las opciones son específicos de la cuenta y se comparten entre distintas
// categorías/pipelines de "deal" (Conciliaciones, Abonos, etc.).

export const HOTEL_ENUM: Record<string, string> = {
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

export const BANK_ENUM: Record<string, string> = {
  '5206': 'Bancolombia',
  '5208': 'Davivienda',
  '5210': 'Otros',
  '5212': 'Paypal',
  '5214': 'Payu',
  '5216': 'Colpatria',
  '12604': 'Cobre',
};

function invert(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, name] of Object.entries(map)) out[name] = id;
  return out;
}

export const HOTEL_NAME_TO_ID = invert(HOTEL_ENUM);
export const BANK_NAME_TO_ID = invert(BANK_ENUM);

export function getHotelOptions(): string[] {
  return Object.values(HOTEL_ENUM).sort();
}

export function getBankOptions(): string[] {
  return Object.values(BANK_ENUM).sort();
}
