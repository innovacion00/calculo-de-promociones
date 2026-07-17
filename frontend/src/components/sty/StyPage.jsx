// Isla de página del módulo STY: shell + módulo (recibe session del shell).
import AppChrome from '../layout/AppChrome.jsx';
import StyModule from './StyModule.jsx';

export default function StyPage() {
  return (
    <AppChrome activeModule="sty">
      {(session) => <StyModule session={session} />}
    </AppChrome>
  );
}
