
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Welcome to CreditWise AI
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Your project is ready. You can start building your application here.
        </p>
      </div>
    </main>
  );
}
