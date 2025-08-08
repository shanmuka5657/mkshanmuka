
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Script from 'next/script';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'MkCreditWise.com - AI Credit Analysis',
  description: 'Advanced AI Credit Score Analyzer & ML Model Trainer by MkCreditWise.com',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#4361ee" />
      </head>
      <body className="font-body antialiased">
        <div className="relative flex flex-col min-h-screen">
          <main className="flex-1">
            {children}
            <div id="install-button" style={{ display: 'none', position: 'fixed', bottom: '80px', right: '20px', zIndex: 1000 }}>
              <Button className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg shadow-lg">Install App</Button>
            </div>
          </main>
        </div>
        <Toaster />
        <Script src="/register-sw.js" defer />
      </body>
    </html>
  );
}
