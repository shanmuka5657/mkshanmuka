
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Fingerprint, FileCheck2, Home, BrainCircuit, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/credit', label: 'Credit', icon: FileText },
  { href: '/verify', label: 'Verify', icon: Fingerprint },
  { href: '/cross-verify', label: 'Cross-Verify', icon: FileCheck2 },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/trainer', label: 'Trainer', icon: BrainCircuit },
];

export function BottomNavbar() {
  const pathname = usePathname();

  // A simple way to handle the root path redirect for active state visual
  const creditIsActive = pathname === '/credit' || pathname === '/';

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-20 bg-background border-t border-border no-print">
      <div className={`grid h-full max-w-lg grid-cols-6 mx-auto font-medium`}>
        {navItems.map((item) => {
          const isActive = item.href === '/credit' ? creditIsActive : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted group',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
