import type { Metadata } from 'next';
import './globals.css';
import { PrepurchaseProvider } from '@/context/PrepurchaseContext';
import { ReconciliationProvider } from '@/context/ReconciliationContext';

export const metadata: Metadata = {
  title: 'Control de Precompra GEH Suites',
  description: 'Herramienta ejecutiva de control de bolsa de precompra Price / PriceTravel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-gray-50 text-gray-900 antialiased">
        <PrepurchaseProvider>
          <ReconciliationProvider>{children}</ReconciliationProvider>
        </PrepurchaseProvider>
      </body>
    </html>
  );
}
