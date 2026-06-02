import { cookies } from 'next/headers';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const COOKIE_NAME = 'rmd_session';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours

export interface SessionPayload {
  userId: string;
  userName: string;
  email: string;
  role: string;
  permissions: string[];
  hotelAccess: string[];
  activeHotelId: string | null;
  authProvider: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

function deriveKey(): Buffer {
  const secret = process.env.SESSION_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? 'dev-session-fallback-key-32chars!!';
  return createHash('sha256').update(secret).digest();
}

function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

function decrypt(encoded: string): string | null {
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

export async function setSession(payload: SessionPayload): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, encrypt(JSON.stringify(payload)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    const session = JSON.parse(json) as SessionPayload;
    if (new Date(session.expiresAt) < new Date()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
