
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Script from 'next/script';
import { BottomNavbar } from '@/components/BottomNavbar';
import { Logo } from '@/components/ui/logo';
import { UserNav } from '@/components/UserNav';

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
        <Script src="/register-sw.js" defer />
      </body>
    </html>
  );
}
