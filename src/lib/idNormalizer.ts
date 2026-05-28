export function normalizeId(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).replace(/[\s\t\n\r]/g, '');
  return /^\d+-\d+$/.test(s) ? s : null;
}
