import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        'flex items-center gap-2 text-lg font-semibold text-primary',
        className
      )}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
      >
        <path
          d="M24.2188 6.5H7.78125C6.8 6.5 6 7.3 6 8.28125V24.7188C6 25.7 6.8 26.5 7.78125 26.5H24.2188C25.2 26.5 26 25.7 26 24.7188V8.28125C26 7.3 25.2 6.5 24.2188 6.5Z"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.9375 16.5L15.3125 19.875L21.0625 12.3438"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 10.5C25.3807 10.5 26.5 9.38071 26.5 8C26.5 6.61929 25.3807 5.5 24 5.5C22.6193 5.5 21.5 6.61929 21.5 8C21.5 9.38071 22.6193 10.5 24 10.5Z"
          fill="hsl(var(--primary))"
        />
      </svg>

      <span className="text-xl font-bold tracking-tight">
        <span className="text-foreground">CreditWise</span>
        <span className="text-primary"> AI</span>
      </span>
    </Link>
  );
}
