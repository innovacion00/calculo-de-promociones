/**
 * googleBusinessReviews.ts
 *
 * High-level review operations used by API routes.
 * Handles token refresh transparently.
 */

import { listReviews } from './googleBusinessClient';
import { refreshAccessToken } from './googleBusinessAuth';
import { getTokens, saveTokens, isTokenExpired } from './googleBusinessTokenStorage';
import type { GoogleBusinessReview } from '../../types/googleBusiness';

/**
 * Returns a valid access token for a user, refreshing if expired.
 * Throws if no tokens are stored or refresh fails.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const tokens = await getTokens(userId);
  if (!tokens) throw new Error('NOT_CONNECTED');

  if (!(await isTokenExpired(userId))) return tokens.accessToken;

  if (!tokens.refreshToken) throw new Error('TOKEN_EXPIRED_NO_REFRESH');

  try {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    const updated = {
      ...tokens,
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    };
    await saveTokens(userId, updated);
    return updated.accessToken;
  } catch {
    throw new Error('TOKEN_REFRESH_FAILED');
  }
}

export async function getReviewsForLocation(
  userId: string,
  locationId: string,
  locationName: string,
  accountId: string,
): Promise<{ reviews: GoogleBusinessReview[]; nextPageToken?: string }> {
  const accessToken = await getValidAccessToken(userId);
  return listReviews(accessToken, locationId, locationName, accountId);
}
