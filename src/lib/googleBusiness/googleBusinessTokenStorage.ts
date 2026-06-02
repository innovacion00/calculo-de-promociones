/**
 * googleBusinessTokenStorage.ts
 *
 * Server-side token storage using HTTP-only encrypted cookies.
 * Tokens survive Vercel cold starts because they are stored in the client's
 * browser cookie, not in server RAM.
 *
 * Encryption: AES-256-GCM with a key derived from GOOGLE_CLIENT_SECRET.
 * The access_token and refresh_token are NEVER sent to the frontend —
 * they only travel as encrypted, httpOnly cookie bytes.
 */

import { cookies } from 'next/headers';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const COOKIE_NAME = 'gbp_session';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;    // Unix timestamp ms
  connectedEmail?: string;
  connectedAt: string;
  scopes: string[];
  userId: string;
}

function deriveKey(): Buffer {
  const secret = process.env.GOOGLE_CLIENT_SECRET ?? 'dev-fallback-key';
  return createHash('sha256').update(secret).digest();
}

function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, body]).toString('base64url');
}

function decrypt(encoded: string): string | null {
  try {
    const buf = Buffer.from(encoded, 'base64url');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const body = buf.subarray(28);
    const key = deriveKey();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(body).toString('utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
}

export async function saveTokens(userId: string, tokens: StoredTokens): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, encrypt(JSON.stringify(tokens)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function getTokens(userId: string): Promise<StoredTokens | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(COOKIE_NAME)?.value;
    if (!raw) return null;
    const json = decrypt(raw);
    if (!json) return null;
    const t: StoredTokens = JSON.parse(json);
    return t.userId === userId ? t : null;
  } catch {
    return null;
  }
}

export async function deleteTokens(userId: string): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function isTokenExpired(userId: string): Promise<boolean> {
  const t = await getTokens(userId);
  if (!t) return true;
  return Date.now() >= t.expiresAt - 60_000;
}

export async function getTokenStatus(userId: string): Promise<'active' | 'expired' | 'not_connected'> {
  const t = await getTokens(userId);
  if (!t) return 'not_connected';
  if (Date.now() >= t.expiresAt - 60_000) return 'expired';
  return 'active';
}

export type { StoredTokens };
