// Isla de página del módulo Usuarios: shell + módulo (recibe session del shell).
import AppChrome from '../layout/AppChrome.jsx';
import UsersModule from './UsersModule.jsx';

export default function UsersPage() {
  return (
    <AppChrome activeModule="users">
      {(session) => <UsersModule session={session} />}
    </AppChrome>
  );
}
