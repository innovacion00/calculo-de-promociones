// Hook de sesión: consulta /api/auth/me una vez y expone { session, loading }.
import { useEffect, useState } from 'react';
import { fetchSession } from '../../lib/session.js';

/**
 * @returns {{ session: import('../../lib/session.js').Session|null, loading: boolean }}
 */
export function useSession() {
  const [state, setState] = useState({ session: null, loading: true });
  useEffect(() => {
    let alive = true;
    fetchSession().then((session) => {
      if (alive) setState({ session, loading: false });
    });
    return () => { alive = false; };
  }, []);
  return state;
}
