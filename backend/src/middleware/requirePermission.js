// Gate de permisos. Uso: router.get('/abonos', requirePermission('canViewFinancialModule'), handler)
// Asume que attachSession ya corrió antes en la cadena de middleware.

/**
 * @param {string} permission
 * @returns {import('express').RequestHandler}
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    // @ts-expect-error — session la adjunta attachSession
    const session = req.session;
    if (!session) {
      res.status(401).json({ ok: false, error: 'No autenticado.' });
      return;
    }
    if (!session.permissions.includes(permission)) {
      res.status(403).json({ ok: false, error: 'Sin permisos.' });
      return;
    }
    next();
  };
}
