export type HotelMapping = Record<string, string>;

export const DEFAULT_HOTEL_MAPPING: HotelMapping = {
  "Hotel Azuan Suites By Geh Suites": "Azuan",
  "Hotel Avexi Suites By Geh Suites": "Avexi",
  "Hotel Aixo Suites By Geh Suites": "Aixo",
  "Hotel Axis Inn by GEH Suites": "Axis",
  "Hotel Bocagrande Suites By GEH Suites": "Bocagrande",
  "Hotel Marina Suites By Geh Suites": "Marina",
  "Hotel Rodadero Inn By GEH Suites": "Rodadero",
  "Hotel Windsor House Inn By GEH Suites": "Windsor",
  "Hotel Madisson Inn Luxury By GEH Suites": "Madisson",
  "Sansiraka Suites by GEH Suites": "Sansiraka",
  "Hotel Abi Inn By GEH Suites": "Abi",
  "Hotel Boquilla Suites By GEH Suites": "Boquilla",
  "Hotel Playa Salguero By GEH Suites": "Playa Salguero",
};

export function normalizeHotel(name: string, mapping: HotelMapping): string {
  if (mapping[name]) return mapping[name];
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(mapping)) {
    if (k.toLowerCase() === lower) return v;
  }
  return name;
}
