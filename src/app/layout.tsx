import type {Metadata} from 'next';
import './globals.css';
<<<<<<< HEAD
import { Toaster } from "@/components/ui/toaster"
import { BottomNavbar } from '@/components/BottomNavbar';
import { Logo } from '@/components/ui/logo';
import { UserNav } from '@/components/UserNav';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata: Metadata = {
  title: 'CreditWise AI - AI Credit Analysis',
  description: 'Advanced AI Credit Score Analyzer & ML Model Trainer by CreditWise AI',
  manifest: '/manifest.json',
=======
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'CreditWise AI',
  description: 'AI-Powered Credit Analysis',
>>>>>>> 4806fcfc5ab332d1c61871cdfdbe9836972303fa
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<<<<<<< HEAD
        <meta name="theme-color" content="#3F51B5" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <div className="relative flex flex-col min-h-screen">
              <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm no-print">
                  <div className="container flex h-16 items-center justify-between">
                      <div className="mr-4 flex items-center">
                        <Logo />
                      </div>
                      <UserNav />
                  </div>
              </header>
            <main className="flex-1 pb-20">
              {children}
            </main>
            <BottomNavbar />
          </div>
          <Toaster />
        </AuthProvider>
=======
      </head>
      <body>
        {children}
        <Toaster />
>>>>>>> 4806fcfc5ab332d1c61871cdfdbe9836972303fa
      </body>
    </html>
  );
}
