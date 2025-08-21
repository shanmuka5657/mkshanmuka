
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Fingerprint, FileCheck2, Home, BrainCircuit, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from '@/hooks/use-toast';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, enabled: true },
  { href: '/credit', label: 'Credit', icon: FileText, enabled: true },
  { href: '/verify', label: 'Verify', icon: Fingerprint, enabled: true },
  { href: '/cross-verify', label: 'Cross-Verify', icon: FileCheck2, enabled: true },
  { href: '/chat', label: 'Chat', icon: MessageCircle, enabled: true },
  { href: '/trainer', label: 'Trainer', icon: BrainCircuit, enabled: true },
];

const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const pathname = usePathname();
    const { toast } = useToast();

    const isActive = item.href === '/credit' ? (pathname === '/credit' || pathname === '/') : pathname === item.href;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!item.enabled) {
            e.preventDefault();
            toast({
                title: "Feature Under Construction",
                description: `The "${item.label}" feature is coming soon!`,
            });
        }
    }

    const navContent = (
        <Link
            href={item.href}
            prefetch={false}
            onClick={handleClick}
            className={cn(
                'inline-flex flex-col items-center justify-center px-5 h-full group',
                isActive ? 'text-primary' : 'text-muted-foreground',
                item.enabled ? 'hover:bg-muted' : 'cursor-not-allowed opacity-50'
            )}
        >
            <item.icon className="w-6 h-6 mb-1" />
            <span className="text-sm">{item.label}</span>
        </Link>
    );

    if (!item.enabled) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>{navContent}</TooltipTrigger>
                    <TooltipContent>
                        <p>Under Construction</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return navContent;
}

export function BottomNavbar() {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-20 bg-background border-t border-border no-print">
      <div className={`grid h-full max-w-lg grid-cols-6 mx-auto font-medium`}>
        {navItems.map((item) => (
            <NavItem key={item.href} item={item} />
        ))}
      </div>
    </div>
  );
}
