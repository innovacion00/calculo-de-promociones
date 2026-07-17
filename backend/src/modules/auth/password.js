// Hash/verificación de contraseñas. Port de src/lib/auth/password.ts.
// Soporta scrypt (formato nuevo) y el hash FNV legacy del sistema localStorage previo.

import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const SALT_LEN = 16;
const KEY_LEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

/**
 * @param {string} password
 * @returns {string} `scrypt:<salt>:<hash>`
 */
export function hashPassword(password) {
  const salt = randomBytes(SALT_LEN).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

/**
 * @param {string} password
 * @param {string} stored
 * @returns {boolean}
 */
export function verifyPassword(password, stored) {
  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    const [, salt, hash] = parts;
    try {
      const derived = scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS);
      const storedBuf = Buffer.from(hash, 'hex');
      if (derived.length !== storedBuf.length) return false;
      return timingSafeEqual(derived, storedBuf);
    } catch {
      return false;
    }
  }
  // Hash FNV legacy del sistema basado en localStorage.
  return legacyFnvHash(password) === stored;
}

/**
 * @param {string} raw
 * @returns {string}
 */
function legacyFnvHash(raw) {
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const b64 = Buffer.from(raw.slice(0, 3)).toString('base64').replace(/=/g, '');
  return 'h' + h.toString(16).padStart(8, '0') + b64;
}
