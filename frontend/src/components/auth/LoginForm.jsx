// Formulario de login (isla React). Llama a /api/auth/login; al éxito redirige al home.
import { useState } from 'react';
import { login } from '../../lib/session.js';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** @param {import('react').FormEvent} e */
  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-title">GEH Suites</div>
        <div className="login-subtitle">Revenue Management · Iniciar sesión</div>
        {error && <div className="login-error">{error}</div>}
        <div className="login-field">
          <label htmlFor="login-email">Correo</label>
          <input
            id="login-email" type="email" autoComplete="username" required
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="login-field">
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password" type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="login-btn" type="submit" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
