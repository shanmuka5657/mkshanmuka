
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Fingerprint, FileCheck2, Home, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/credit', label: 'Credit', icon: FileText },
  { href: '/verify', label: 'Verify', icon: Fingerprint },
  { href: '/cross-verify', label: 'Cross-Verify', icon: FileCheck2 },
  { href: '/trainer', label: 'Trainer', icon: BrainCircuit },
];

export function BottomNavbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  
  // Don't show the navbar if the user isn't authenticated yet or on the login page.
  if (!user || pathname === '/' || pathname === '/login') {
    return null;
  }
  
  const navItems = allNavItems;

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-20 bg-background border-t border-border no-print">
      <div className={`grid h-full max-w-lg grid-cols-5 mx-auto font-medium`}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
