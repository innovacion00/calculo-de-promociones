import { NextResponse } from 'next/server';
import { fetchBitrixUsers, fetchTimemanStatus } from '../../../../lib/bitrixTimeman';

export async function GET() {
  try {
    const users = await fetchBitrixUsers();
    const statuses = await fetchTimemanStatus(users.map((user) => user.id));

    const paused = statuses
      .filter((item) => item.status === 'PAUSED')
      .map((item) => ({
        id: item.userId,
        nombre: users.find((user) => user.id === item.userId)?.name || `Usuario ${item.userId}`,
        status: item.status,
        timeFinish: item.timeFinish,
      }));

    return NextResponse.json({ paused }, { status: 200 });
  } catch (error) {
    console.error('[status/paused] Error:', error);
    return NextResponse.json(
      { error: 'Error al consultar usuarios en pausa' },
      { status: 500 }
    );
  }
}
