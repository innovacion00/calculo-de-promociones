// Utilidades HTTP compartidas para las llamadas a Bitrix24.
// Bitrix limita la tasa de peticiones (~2/seg por webhook) y responde 503/429 cuando
// se le satura. Antes se lanzaban ~36 páginas en paralelo por cada crawl y, al abrir
// Conciliaciones (stats + list a la vez), se disparaban ~70 peticiones simultáneas → 503.
// Aquí limitamos la concurrencia y reintentamos con backoff.

/** @param {number} ms */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch con reintentos ante 503/429 (rate limit) y timeout.
 * @param {string} url
 * @param {RequestInit} [opts]
 * @param {number} [retries]
 * @returns {Promise<Response>}
 */
export async function bitrixFetch(url, opts = {}, retries = 4) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20_000), ...opts });
    } catch (e) {
      if (attempt < retries) { await sleep(400 * 2 ** attempt); continue; }
      throw e;
    }
    if ((res.status === 503 || res.status === 429) && attempt < retries) {
      await sleep(400 * 2 ** attempt); // 400ms, 800ms, 1.6s, 3.2s
      continue;
    }
    return res;
  }
}

/**
 * Ejecuta `fn` sobre `items` con concurrencia limitada (preserva el orden de resultados).
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
export async function mapLimit(items, limit, fn) {
  /** @type {R[]} */
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  };
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

/** Máximo de páginas de Bitrix a traer en paralelo. */
export const BITRIX_CONCURRENCY = 3;
