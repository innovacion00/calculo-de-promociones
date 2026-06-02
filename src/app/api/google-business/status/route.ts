import { NextRequest, NextResponse } from 'next/server';
import { getTokens, getTokenStatus } from '../../../../lib/googleBusiness/googleBusinessTokenStorage';

// GET /api/google-business/status
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') ?? '';
  if (!userId) return NextResponse.json({ error: 'Missing x-user-id header' }, { status: 400 });

  const tokens = await getTokens(userId);
  if (!tokens) {
    return NextResponse.json({ connected: false, tokenStatus: 'not_connected', scopes: [] });
  }

  const tokenStatus = await getTokenStatus(userId);

  return NextResponse.json({
    connected: tokenStatus === 'active',
    connectedEmail: tokens.connectedEmail,
    connectedAt: tokens.connectedAt,
    tokenStatus,
    scopes: tokens.scopes,
  });
}
