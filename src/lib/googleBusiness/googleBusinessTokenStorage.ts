/**
 * googleBusinessTokenStorage.ts
 *
 * Server-side only token storage for Google Business Profile OAuth tokens.
 *
 * CURRENT IMPLEMENTATION: In-memory store (development only).
 * PRODUCTION MIGRATION: Replace with encrypted database storage.
 *   - Use Supabase: store encrypted refresh_token in a `gbp_connections` table.
 *   - Encrypt with AES-256-GCM using a server-managed key (not committed to repo).
 *   - Never log or return tokens in API responses.
 *
 * The access_token and refresh_token are NEVER sent to the frontend.
 */

interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;    // Unix timestamp ms
  connectedEmail?: string;
  connectedAt: string;
  scopes: string[];
  userId: string;
}

// In-memory store — resets on server restart (acceptable for dev)
// PRODUCTION: Replace with DB lookup by userId
const tokenStore = new Map<string, StoredTokens>();

export function saveTokens(userId: string, tokens: StoredTokens): void {
  tokenStore.set(userId, tokens);
}

export function getTokens(userId: string): StoredTokens | null {
  return tokenStore.get(userId) ?? null;
}

export function deleteTokens(userId: string): void {
  tokenStore.delete(userId);
}

export function isTokenExpired(userId: string): boolean {
  const t = tokenStore.get(userId);
  if (!t) return true;
  return Date.now() >= t.expiresAt - 60_000; // 1 min buffer
}

export function getTokenStatus(userId: string): 'active' | 'expired' | 'not_connected' {
  const t = tokenStore.get(userId);
  if (!t) return 'not_connected';
  if (isTokenExpired(userId)) return 'expired';
  return 'active';
}

export type { StoredTokens };
