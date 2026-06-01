// Google Business Profile — Phase 1 types (read-only)

export interface GoogleBusinessConnection {
  id: string;
  userId: string;
  userEmail: string;
  connectedAt: string;       // ISO 8601
  scopes: string[];
  tokenStatus: 'active' | 'expired' | 'revoked' | 'unknown';
  connected: boolean;
  connectedEmail?: string;   // Google account email used to connect
}

export interface GoogleBusinessAccount {
  accountId: string;
  accountName: string;
  type?: string;
  verificationState?: string;
  vettedState?: string;
}

export interface GoogleBusinessLocation {
  locationId: string;
  locationName: string;
  address?: string;
  primaryPhone?: string;
  websiteUri?: string;
  verified?: boolean;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
}

export interface GoogleBusinessReviewReply {
  comment: string;
  updateTime: string;
}

export interface GoogleBusinessReview {
  reviewId: string;
  name: string;
  reviewerName: string;
  reviewerPhotoUrl?: string;
  isAnonymous: boolean;
  rating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  ratingNumeric: number;       // 1-5
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: GoogleBusinessReviewReply;
  locationId: string;
  locationName: string;
  accountId: string;
}

export interface GoogleBusinessDiagnostics {
  connected: boolean;
  tokenStatus: 'active' | 'expired' | 'revoked' | 'unknown' | 'not_connected';
  connectedEmail?: string;
  connectedAt?: string;
  scopes: string[];
  accountCount: number;
  locationCount: number;
  reviewCount: number;
  lastError?: string;
  checkedAt: string;
}

export interface GBPAuthUrlResponse {
  url: string;
}

export interface GBPStatusResponse {
  connected: boolean;
  connectedEmail?: string;
  connectedAt?: string;
  tokenStatus: string;
  scopes: string[];
}

export interface GBPAccountsResponse {
  accounts: GoogleBusinessAccount[];
}

export interface GBPLocationsResponse {
  locations: GoogleBusinessLocation[];
}

export interface GBPReviewsResponse {
  reviews: GoogleBusinessReview[];
  locationName?: string;
  nextPageToken?: string;
}

export type GBPAuditAction =
  | 'google_business_connect_started'
  | 'google_business_connect_success'
  | 'google_business_connect_failed'
  | 'google_business_accounts_loaded'
  | 'google_business_locations_loaded'
  | 'google_business_reviews_loaded'
  | 'google_business_token_error'
  | 'google_business_disconnected';

export interface GBPAuditEvent {
  action: GBPAuditAction;
  userId: string;
  userName: string;
  email: string;
  timestamp: string;
  status: 'success' | 'error' | 'info';
  metadata?: Record<string, unknown>;
}
