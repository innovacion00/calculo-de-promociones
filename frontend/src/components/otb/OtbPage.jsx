// Isla de página del módulo OTB: shell + módulo (recibe session del shell).
import AppChrome from '../layout/AppChrome.jsx';
import OtbModule from './OtbModule.jsx';

export default function OtbPage() {
  return (
    <AppChrome activeModule="otb">
      {(session) => <OtbModule session={session} />}
    </AppChrome>
  );
}
