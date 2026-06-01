/**
 * googleBusinessClient.ts
 *
 * HTTP client for the Google My Business APIs.
 * Server-side only.
 *
 * API references:
 *   Accounts:  https://mybusinessaccountmanagement.googleapis.com/v1/accounts
 *   Locations: https://mybusinessbusinessinformation.googleapis.com/v1/{account}/locations
 *   Reviews:   https://mybusinessreviews.googleapis.com/v1/{location}/reviews
 */

import type { GoogleBusinessAccount, GoogleBusinessLocation, GoogleBusinessReview } from '../../types/googleBusiness';

const ACCOUNTS_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const LOCATIONS_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const REVIEWS_API   = 'https://mybusinessreviews.googleapis.com/v1';

const STAR_TO_NUM: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

async function gbpFetch<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (res.status === 403) throw new Error('INSUFFICIENT_PERMISSIONS');
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GBP API error ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json();
}

// ── Accounts ─────────────────────────────────────────────────────────────────

interface RawAccount {
  name: string;
  accountName: string;
  type?: string;
  verificationState?: string;
  vettedState?: string;
}

interface AccountsResponse {
  accounts?: RawAccount[];
  nextPageToken?: string;
}

export async function listAccounts(accessToken: string): Promise<GoogleBusinessAccount[]> {
  const all: GoogleBusinessAccount[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${ACCOUNTS_API}/accounts`);
    url.searchParams.set('pageSize', '50');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const data = await gbpFetch<AccountsResponse>(url.toString(), accessToken);
    for (const a of data.accounts ?? []) {
      all.push({
        accountId: a.name,            // "accounts/{id}"
        accountName: a.accountName,
        type: a.type,
        verificationState: a.verificationState,
        vettedState: a.vettedState,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return all;
}

// ── Locations ─────────────────────────────────────────────────────────────────

interface RawLocation {
  name: string;
  title?: string;
  phoneNumbers?: { primaryPhone?: string };
  websiteUri?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
  metadata?: { hasGoogleUpdated?: boolean; hasPendingEdits?: boolean };
}

interface LocationsResponse {
  locations?: RawLocation[];
  nextPageToken?: string;
}

export async function listLocations(
  accessToken: string,
  accountId: string,
  readMask = 'name,title,phoneNumbers,websiteUri,storefrontAddress,metadata'
): Promise<GoogleBusinessLocation[]> {
  const all: GoogleBusinessLocation[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${LOCATIONS_API}/${accountId}/locations`);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('readMask', readMask);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const data = await gbpFetch<LocationsResponse>(url.toString(), accessToken);
    for (const loc of data.locations ?? []) {
      const addr = loc.storefrontAddress;
      all.push({
        locationId: loc.name,         // "accounts/{id}/locations/{id}"
        locationName: loc.title ?? loc.name,
        primaryPhone: loc.phoneNumbers?.primaryPhone,
        websiteUri: loc.websiteUri,
        storefrontAddress: addr,
        address: addr
          ? [
              (addr.addressLines ?? []).join(', '),
              addr.locality,
              addr.administrativeArea,
              addr.postalCode,
            ].filter(Boolean).join(', ')
          : undefined,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return all;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

interface RawReview {
  name: string;
  reviewId: string;
  reviewer: { profilePhotoUrl?: string; displayName: string; isAnonymous?: boolean };
  starRating: string;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
}

interface ReviewsResponse {
  reviews?: RawReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

export async function listReviews(
  accessToken: string,
  locationId: string,
  locationName: string,
  accountId: string,
  options: { pageSize?: number; maxPages?: number } = {}
): Promise<{ reviews: GoogleBusinessReview[]; nextPageToken?: string }> {
  const { pageSize = 50, maxPages = 10 } = options;
  const all: GoogleBusinessReview[] = [];
  let pageToken: string | undefined;
  let page = 0;

  do {
    const url = new URL(`${REVIEWS_API}/${locationId}/reviews`);
    url.searchParams.set('pageSize', String(pageSize));
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const data = await gbpFetch<ReviewsResponse>(url.toString(), accessToken);
    for (const r of data.reviews ?? []) {
      all.push({
        reviewId: r.reviewId,
        name: r.name,
        reviewerName: r.reviewer.displayName,
        reviewerPhotoUrl: r.reviewer.profilePhotoUrl,
        isAnonymous: r.reviewer.isAnonymous ?? false,
        rating: r.starRating as GoogleBusinessReview['rating'],
        ratingNumeric: STAR_TO_NUM[r.starRating] ?? 0,
        comment: r.comment,
        createTime: r.createTime,
        updateTime: r.updateTime,
        reviewReply: r.reviewReply,
        locationId,
        locationName,
        accountId,
      });
    }
    pageToken = data.nextPageToken;
    page++;
  } while (pageToken && page < maxPages);

  return { reviews: all, nextPageToken: pageToken };
}
