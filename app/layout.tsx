import './globals.css';
import { DimensionIconsProvider } from '@/context/DimensionIconsContext';
import ExternalNavigationManager from '@/components/system/ExternalNavigationManager';

export const metadata = {
  title: 'RA-H Open Source',
  description: 'Local-first research workspace with a BYO-key AI orchestrator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DimensionIconsProvider>
          <ExternalNavigationManager />
          {children}
        </DimensionIconsProvider>
      </body>
    </html>
  );
}
