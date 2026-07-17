// Sesión cifrada en cookie httpOnly (AES-256-GCM).
// Port de src/lib/auth/session.ts: la CRIPTOGRAFÍA es idéntica (compatible con cookies
// emitidas por la app Next durante la convivencia). Lo único que cambia respecto a Next
// es que aquí NO usamos cookies() de next/headers: encode/decode operan sobre strings,
// y el middleware de Express se encarga de leer/escribir la cookie en req/res.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env, isProd } from '../../config/env.js';

export const COOKIE_NAME = 'rmd_session';
export const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Opciones de cookie equivalentes a las que emitía Next (httpOnly, lax, 24h).
 * @type {import('express').CookieOptions}
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  maxAge: COOKIE_MAX_AGE_MS,
  path: '/',
};

/**
 * @typedef {Object} SessionPayload
 * @property {string} userId
 * @property {string} userName
 * @property {string} email
 * @property {string} role
 * @property {string[]} permissions
 * @property {string[]} hotelAccess
 * @property {string | null} activeHotelId
 * @property {string} authProvider
 * @property {string} createdAt
 * @property {string} lastActivityAt
 * @property {string} expiresAt
 */

/** @returns {Buffer} */
function deriveKey() {
  return createHash('sha256').update(env.sessionSecret).digest();
}

/**
 * @param {string} plaintext
 * @returns {string} base64url(iv | tag | ciphertext)
 */
export function encryptSession(plaintext) {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

/**
 * @param {string} encoded
 * @returns {string | null}
 */
export function decryptSession(encoded) {
  try {
    const key = deriveKey();
    const buf = Buffer.from(encoded, 'base64url');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    return null;
  }
}

/**
 * Serializa y cifra un payload de sesión listo para guardar en cookie.
 * @param {SessionPayload} payload
 * @returns {string}
 */
export function serializeSession(payload) {
  return encryptSession(JSON.stringify(payload));
}

/**
 * Descifra el valor de la cookie y devuelve el payload si es válido y no expiró.
 * @param {string | undefined} rawCookieValue
 * @returns {SessionPayload | null}
 */
export function parseSession(rawCookieValue) {
  if (!rawCookieValue) return null;
  const json = decryptSession(rawCookieValue);
  if (!json) return null;
  try {
    const session = /** @type {SessionPayload} */ (JSON.parse(json));
    if (new Date(session.expiresAt) < new Date()) return null;
    return session;
  } catch {
    return null;
  }
}
