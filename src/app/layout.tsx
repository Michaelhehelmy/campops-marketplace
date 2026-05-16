import PWAServiceWorker from '@/components/PWAServiceWorker';
import './globals.css';
import PluginInitializer from '@/components/PluginInitializer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <PluginInitializer />
        <PWAServiceWorker />
        {children}
      </body>
    </html>
  );
}
