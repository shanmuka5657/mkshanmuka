
import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M16.498 6.50009H6.49805C4.28891 6.50009 2.49805 8.29097 2.49805 10.5001V16.5001C2.49805 18.7092 4.28891 20.5001 6.49805 20.5001H14.498C16.7072 20.5001 18.498 18.7092 18.498 16.5001V10.5001C18.498 8.29097 16.7072 6.50009 14.498 6.50009H16.498Z" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 13.5L10 16.5L15 11.5" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="18.5" cy="5.5" r="2.5" fill="hsl(var(--primary))"/>
    </svg>

    <div className="flex items-baseline">
        <span className="font-bold text-lg text-foreground">Credit</span>
        <span className="font-bold text-lg text-foreground ml-1">Wise</span>
        <span className="font-bold text-lg text-primary ml-1">AI</span>
    </div>
  </div>
);
