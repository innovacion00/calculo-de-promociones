'use client';

import { useEffect, useState } from 'react';

type UserStatus = {
  id: number;
  nombre: string;
  status: string;
  timeStart?: string | null;
  timeFinish?: string | null;
  duration?: number | null;
};

const statusLabel: Record<string, string> = {
  OPENED: 'Activo',
  PAUSED: 'En pausa',
  CLOSED: 'Cerrado',
};

export default function MonitorPage() {
  const [users, setUsers] = useState<UserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      setError('');
      const response = await fetch('/api/status/users-status');
      if (!response.ok) throw new Error('No se pudo cargar el estado de usuarios');
      const data = (await response.json()) as UserStatus[];
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError('No fue posible cargar los usuarios en tiempo real.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    const interval = setInterval(loadUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const total = users.length;
  const opened = users.filter((u) => u.status === 'OPENED').length;
  const paused = users.filter((u) => u.status === 'PAUSED').length;
  const closed = users.filter((u) => u.status === 'CLOSED').length;

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f7f3ed 0%,#efe6da 100%)', color: '#2f2f2f', padding: 24 }}>
      <section style={{ maxWidth: 1400, margin: '0 auto' }}>
        <header style={{ background: 'white', borderRadius: 24, padding: 28, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', marginBottom: 24 }}>
          <p style={{ textTransform: 'uppercase', letterSpacing: 3, color: '#9a6d31', fontSize: 12, fontWeight: 800 }}>Monitoreo Bitrix24</p>
          <h1 style={{ fontSize: 32, marginTop: 8, fontWeight: 800, color: '#8a5a1a' }}>Estado en tiempo real de usuarios</h1>
          <p style={{ color: '#6b6b6b', marginTop: 8 }}>Datos consumidos desde la API integrada con Bitrix24 y MongoDB.</p>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 24 }}>
            {[
              ['Total', total],
              ['Activos', opened],
              ['En pausa', paused],
              ['Cerrados', closed],
            ].map(([label, value]) => (
              <article key={label} style={{ minWidth: 140, background: '#fffaf5', border: '1px solid #ead8bf', borderRadius: 18, padding: 16, boxShadow: '0 8px 18px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 12, color: '#8a6a4a', textTransform: 'uppercase', letterSpacing: 1.6, fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#8a5a1a', marginTop: 6 }}>{value}</div>
              </article>
            ))}
          </div>
        </header>

        {loading && <p style={{ textAlign: 'center', color: '#6b6b6b' }}>Cargando usuarios…</p>}
        {error && <p style={{ textAlign: 'center', color: '#b45309' }}>{error}</p>}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {users.map((user) => (
            <article key={user.id} style={{ background: 'white', borderRadius: 20, padding: 18, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', border: '1px solid #efe2d2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 999, background: 'linear-gradient(135deg,#d49841,#9a6d31)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18 }}>
                  {user.nombre
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#2b2b2b' }}>{user.nombre}</h2>
                  <p style={{ color: '#7b7b7b', fontSize: 12, marginTop: 2 }}>ID de usuario: {user.id}</p>
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: user.status === 'PAUSED' ? '#fff7db' : user.status === 'OPENED' ? '#e8f4ff' : '#ffeaea', color: user.status === 'PAUSED' ? '#a16207' : user.status === 'OPENED' ? '#1d4ed8' : '#b91c1c', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: user.status === 'PAUSED' ? '#fbbf24' : user.status === 'OPENED' ? '#22c55e' : '#ef4444' }} />
                {statusLabel[user.status] || user.status}
              </div>

              <p style={{ marginTop: 14, color: '#6b6b6b', fontSize: 13 }}>
                Última actualización: {new Date().toLocaleTimeString('es-ES')}
              </p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
