import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const SALT_LEN = 16;
const KEY_LEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
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
  // Legacy FNV hash from localStorage-based system
  const legacyHash = legacyFnvHash(password);
  return legacyHash === stored;
}

function legacyFnvHash(raw: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return 'h' + h.toString(16).padStart(8, '0') + btoa(raw.slice(0, 3)).replace(/=/g, '');
}
