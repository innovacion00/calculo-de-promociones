// Wrapper de fetch para hablar con el backend Express.
// `credentials: 'include'` asegura que la cookie de sesión viaje (importante si algún
// día se usan orígenes separados; con el proxy dev es inofensivo).
// Todas las respuestas del backend siguen la forma { ok: boolean, error?: string, ... }.

/**
 * @template T
 * @param {string} path  Ruta bajo /api, p. ej. '/health' o '/financial/abonos'
 * @param {RequestInit} [options]
 * @returns {Promise<T>}
 */
export async function apiFetch(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
  /** @type {any} */
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Respuesta no-JSON del servidor (HTTP ${res.status})`);
  }
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.error ?? `Error HTTP ${res.status}`);
  }
  return body;
}
