/**
 * googleBusinessAudit.ts
 *
 * Audit logging for Google Business Profile integration events.
 * Server-side events are written to console (structured JSON) — replace with
 * a real log sink (Datadog, CloudWatch, Supabase audit table) in production.
 */

import type { GBPAuditAction, GBPAuditEvent } from '../../types/googleBusiness';

export function logGBPEvent(
  action: GBPAuditAction,
  params: {
    userId: string;
    userName: string;
    email: string;
    status: GBPAuditEvent['status'];
    metadata?: Record<string, unknown>;
  }
): GBPAuditEvent {
  const event: GBPAuditEvent = {
    action,
    userId: params.userId,
    userName: params.userName,
    email: params.email,
    timestamp: new Date().toISOString(),
    status: params.status,
    metadata: params.metadata,
  };

  // Structured log — replace with real log sink in production
  console.log('[GBP_AUDIT]', JSON.stringify(event));

  return event;
}
