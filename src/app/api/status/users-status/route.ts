import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/mongodb';
import { fetchBitrixUsers, fetchTimemanStatus } from '../../../../lib/bitrixTimeman';

export async function GET() {
  try {
    const users = await fetchBitrixUsers();
    const userIds = users.map((user) => user.id);
    const statuses = await fetchTimemanStatus(userIds);

    const payload = statuses.map((status) => {
      const user = users.find((item) => item.id === status.userId);
      return {
        id: status.userId,
        nombre: user?.name || `Usuario ${status.userId}`,
        status: status.status,
        timeStart: status.timeStart,
        timeFinish: status.timeFinish,
        duration: status.duration,
      };
    });

    try {
      const db = await getDb();
      await db.collection('timeman_snapshots').insertOne({
        capturedAt: new Date(),
        source: 'bitrix-timeman',
        count: payload.length,
        users: payload,
      });
    } catch (dbError) {
      console.error('[status] No se pudo guardar snapshot en MongoDB:', dbError);
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('[status] Error consultando Bitrix:', error);
    return NextResponse.json(
      { error: 'Error al consultar el estado de usuarios' },
      { status: 500 }
    );
  }
}
