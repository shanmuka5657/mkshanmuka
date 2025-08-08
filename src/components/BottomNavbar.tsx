
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Fingerprint, FileCheck2, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const allNavItems = [
  { href: '/credit', label: 'Credit', icon: FileText, roles: ['user', 'admin'] },
  { href: '/verify', label: 'Verify', icon: Fingerprint, roles: ['user', 'admin'] },
  { href: '/cross-verify', label: 'Cross-Verify', icon: FileCheck2, roles: ['user', 'admin'] },
  { href: '/trainer', label: 'Trainer', icon: BrainCircuit, roles: ['admin'] },
];

export function BottomNavbar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Ensure this runs only on the client
    setUserRole(localStorage.getItem('userRole'));
  }, []);

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => 
    item.roles.includes(userRole || 'user')
  );

  // Don't render the navbar until the role is determined, to avoid flash of incorrect items
  if (!userRole) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-20 bg-background border-t border-border print:hidden">
      <div className={`grid h-full max-w-lg grid-cols-${navItems.length} mx-auto font-medium`}>
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
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
