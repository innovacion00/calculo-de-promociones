import { NextRequest, NextResponse } from 'next/server';
import { deleteTokens } from '../../../../lib/googleBusiness/googleBusinessTokenStorage';
import { logGBPEvent } from '../../../../lib/googleBusiness/googleBusinessAudit';

// POST /api/google-business/disconnect
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id') ?? '';
  const userName = req.headers.get('x-user-name') ?? '';
  const userEmail = req.headers.get('x-user-email') ?? '';

  if (!userId) return NextResponse.json({ error: 'Missing x-user-id header' }, { status: 400 });

  deleteTokens(userId);

  logGBPEvent('google_business_disconnected', {
    userId, userName, email: userEmail, status: 'info',
  });

  return NextResponse.json({ disconnected: true });
}
