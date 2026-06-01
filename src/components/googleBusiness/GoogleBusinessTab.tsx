'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  GBPStatusResponse,
  GoogleBusinessAccount,
  GoogleBusinessLocation,
  GoogleBusinessReview,
  GoogleBusinessDiagnostics,
} from '../../types/googleBusiness';
import GoogleBusinessStatusCard from './GoogleBusinessStatusCard';
import GoogleBusinessAccountSelector from './GoogleBusinessAccountSelector';
import GoogleBusinessLocationSelector from './GoogleBusinessLocationSelector';
import GoogleBusinessReviewsTable from './GoogleBusinessReviewsTable';
import GoogleBusinessDiagnosticsCmp from './GoogleBusinessDiagnostics';

interface UserSession {
  id: string;
  name: string;
  email: string;
}

interface Props {
  user: UserSession;
}

function gbpHeaders(user: UserSession): Record<string, string> {
  return {
    'x-user-id': user.id,
    'x-user-name': user.name,
    'x-user-email': user.email,
  };
}

export default function GoogleBusinessTab({ user }: Props) {
  const [status, setStatus] = useState<GBPStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [accounts, setAccounts] = useState<GoogleBusinessAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; name: string } | null>(null);

  const [reviews, setReviews] = useState<GoogleBusinessReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [diagnostics, setDiagnostics] = useState<GoogleBusinessDiagnostics | null>(null);

  // ── Load status ──────────────────────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/google-business/status', { headers: gbpHeaders(user) });
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [user]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Check for OAuth callback result in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gbp_connected')) {
      loadStatus();
      window.history.replaceState({}, '', window.location.pathname);
    }
    const err = params.get('gbp_error');
    if (err) {
      const msg = decodeURIComponent(err);
      const friendlyErrors: Record<string, string> = {
        no_refresh_token: 'No se recibió refresh token. Revisa la configuración OAuth y vuelve a autorizar.',
        access_denied: 'Acceso denegado por el usuario.',
      };
      alert('Error al conectar Google Business: ' + (friendlyErrors[msg] ?? msg));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadStatus]);

  // ── Connect ──────────────────────────────────────────────────────────────────
  const handleConnect = async () => {
    try {
      const res = await fetch('/api/google-business/auth-url', { headers: gbpHeaders(user) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert('Error al generar URL de autorización.');
    } catch {
      alert('Error de red al conectar.');
    }
  };

  // ── Disconnect ────────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar Google Business Profile?')) return;
    await fetch('/api/google-business/disconnect', { method: 'POST', headers: gbpHeaders(user) });
    setStatus(null);
    setAccounts([]);
    setLocations([]);
    setReviews([]);
    setSelectedAccount(null);
    setSelectedLocation(null);
    setDiagnostics(null);
    loadStatus();
  };

  // ── Load accounts when connected ──────────────────────────────────────────────
  useEffect(() => {
    if (!status?.connected) return;
    setAccountsLoading(true);
    setAccountsError(null);
    fetch('/api/google-business/accounts', { headers: gbpHeaders(user) })
      .then(r => r.json())
      .then(d => {
        if (d.accounts) setAccounts(d.accounts);
        else setAccountsError(d.message ?? 'Error al cargar cuentas.');
      })
      .catch(() => setAccountsError('Error de red al cargar cuentas.'))
      .finally(() => setAccountsLoading(false));
  }, [status?.connected, user]);

  // ── Load locations when account selected ──────────────────────────────────────
  useEffect(() => {
    if (!selectedAccount) return;
    setLocationsLoading(true);
    setLocationsError(null);
    setLocations([]);
    setSelectedLocation(null);
    setReviews([]);
    fetch(`/api/google-business/locations?accountId=${encodeURIComponent(selectedAccount)}`, { headers: gbpHeaders(user) })
      .then(r => r.json())
      .then(d => {
        if (d.locations) setLocations(d.locations);
        else setLocationsError(d.message ?? 'Error al cargar ubicaciones.');
      })
      .catch(() => setLocationsError('Error de red al cargar ubicaciones.'))
      .finally(() => setLocationsLoading(false));
  }, [selectedAccount, user]);

  // ── Load reviews when location selected ──────────────────────────────────────
  useEffect(() => {
    if (!selectedLocation || !selectedAccount) return;
    setReviewsLoading(true);
    setReviewsError(null);
    setReviews([]);
    const p = new URLSearchParams({
      accountId: selectedAccount,
      locationId: selectedLocation.id,
      locationName: selectedLocation.name,
    });
    fetch(`/api/google-business/reviews?${p}`, { headers: gbpHeaders(user) })
      .then(r => r.json())
      .then(d => {
        if (d.reviews) setReviews(d.reviews);
        else setReviewsError(d.message ?? 'Error al cargar reseñas.');
      })
      .catch(() => setReviewsError('Error de red al cargar reseñas.'))
      .finally(() => setReviewsLoading(false));
  }, [selectedLocation, selectedAccount, user]);

  // ── Build diagnostics ─────────────────────────────────────────────────────────
  useEffect(() => {
    setDiagnostics({
      connected: status?.connected ?? false,
      tokenStatus: (status?.tokenStatus as GoogleBusinessDiagnostics['tokenStatus']) ?? 'not_connected',
      connectedEmail: status?.connectedEmail,
      connectedAt: status?.connectedAt,
      scopes: status?.scopes ?? [],
      accountCount: accounts.length,
      locationCount: locations.length,
      reviewCount: reviews.length,
      lastError: accountsError ?? locationsError ?? reviewsError ?? undefined,
      checkedAt: new Date().toISOString(),
    });
  }, [status, accounts, locations, reviews, accountsError, locationsError, reviewsError]);

  return (
    <div className="gbp-tab">
      <div className="gbp-header">
        <h2>Google Business Profile</h2>
        <p className="gbp-subtitle">Fase 1 — Conexión y lectura de reseñas</p>
      </div>

      <div className="gbp-content">
        <GoogleBusinessStatusCard
          status={status}
          loading={statusLoading}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />

        {status?.connected && (
          <>
            <div className="gbp-selectors">
              <GoogleBusinessAccountSelector
                accounts={accounts}
                selectedId={selectedAccount}
                onSelect={setSelectedAccount}
                loading={accountsLoading}
                error={accountsError}
              />
              {selectedAccount && (
                <GoogleBusinessLocationSelector
                  locations={locations}
                  selectedId={selectedLocation?.id ?? null}
                  onSelect={(id, name) => setSelectedLocation({ id, name })}
                  loading={locationsLoading}
                  error={locationsError}
                />
              )}
            </div>

            {selectedLocation && (
              <div className="gbp-reviews-section">
                <h3>Reseñas — {selectedLocation.name}</h3>
                <GoogleBusinessReviewsTable
                  reviews={reviews}
                  loading={reviewsLoading}
                  error={reviewsError}
                />
              </div>
            )}
          </>
        )}

        <GoogleBusinessDiagnosticsCmp diagnostics={diagnostics} />
      </div>
    </div>
  );
}
