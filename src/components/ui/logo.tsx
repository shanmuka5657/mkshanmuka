import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-3", className)}>
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <path
          d="M23.5 10H8.5C6.01472 10 4 12.0147 4 14.5V23.5C4 25.9853 6.01472 28 8.5 28H19.5C21.9853 28 24 25.9853 24 23.5V14.5C24 12.0147 21.9853 10 19.5 10H23.5"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 19L14 23L20 17"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="8" r="3" fill="hsl(var(--primary))" />
      </g>
    </svg>
    <div className="flex items-baseline">
        <span className="font-bold text-lg text-foreground">Credit</span>
        <span className="font-bold text-lg text-foreground ml-1">Wise</span>
        <span className="font-bold text-lg text-primary ml-1">AI</span>
    </div>
  </div>
);