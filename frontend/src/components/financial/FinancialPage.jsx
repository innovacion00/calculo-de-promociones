// Isla de página del módulo financiero: compone el shell (AppChrome) + el módulo,
// todo en un solo island para hidratar como un árbol React único.
import AppChrome from '../layout/AppChrome.jsx';
import FinancialModule from './FinancialModule.jsx';

export default function FinancialPage() {
  return (
    <AppChrome activeModule="financial">
      <FinancialModule />
    </AppChrome>
  );
}
