export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getDb } = await import('./lib/db/mongodb');
    try {
      const db = await getDb();
      await db.command({ ping: 1 });
      console.log(`[MongoDB] ✅ Conectado a "${db.databaseName}"`);
    } catch (e) {
      console.error(`[MongoDB] ❌ Error de conexión: ${(e as Error).message}`);
    }
  }
}
