
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Fingerprint, FileCheck2, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/credit', label: 'Credit', icon: FileText },
  { href: '/verify', label: 'Verify', icon: Fingerprint },
  { href: '/cross-verify', label: 'Cross-Verify', icon: FileCheck2 },
  { href: '/trainer', label: 'Trainer', icon: BrainCircuit },
];

export function BottomNavbar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border print:hidden">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted group',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
