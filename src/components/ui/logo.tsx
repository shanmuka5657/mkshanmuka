
import Link from 'next/link';
import { WalletCards } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/credit" className={cn("flex items-center gap-2 text-lg font-semibold text-primary", className)}>
      <WalletCards className="h-6 w-6" />
      <span className="text-foreground">CreditWise AI</span>
    </Link>
  );
}
