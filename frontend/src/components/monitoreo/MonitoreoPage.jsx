// Isla de página del módulo Monitoreo: shell + módulo.
import AppChrome from '../layout/AppChrome.jsx';
import MonitoreoModule from './MonitoreoModule.jsx';

export default function MonitoreoPage() {
  return (
    <AppChrome activeModule="monitoreo">
      <MonitoreoModule />
    </AppChrome>
  );
}
