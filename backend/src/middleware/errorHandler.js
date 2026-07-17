// Manejo central de errores. Va montado al final, después de todos los routers.

/**
 * 404 para rutas /api no encontradas.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export function notFound(_req, res) {
  res.status(404).json({ ok: false, error: 'Recurso no encontrado.' });
}

/**
 * Error handler de Express (firma de 4 argumentos).
 * @param {unknown} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorHandler(err, _req, res, _next) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[error]', message);
  res.status(500).json({ ok: false, error: message });
}
