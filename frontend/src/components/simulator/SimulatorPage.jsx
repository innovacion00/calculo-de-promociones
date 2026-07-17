// Isla de página del módulo Simulador de Tarifas: shell + módulo (recibe session del shell).
import AppChrome from '../layout/AppChrome.jsx';
import SimulatorModule from './SimulatorModule.jsx';

export default function SimulatorPage() {
  return (
    <AppChrome activeModule="simulator">
      {(session) => <SimulatorModule session={session} />}
    </AppChrome>
  );
}
