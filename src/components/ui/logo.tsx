import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
    >
      <path
        d="M16 2.66663C8.63636 2.66663 2.66669 8.63632 2.66669 16C2.66669 23.3636 8.63636 29.3333 16 29.3333C23.3637 29.3333 29.3334 23.3636 29.3334 16C29.3334 8.63632 23.3637 2.66663 16 2.66663Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M21.3334 21.3333L10.6667 21.3333V10.6666L21.3334 10.6666V21.3333Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6667 16H21.3334"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
       <path
        d="M16 10.6666V21.3333"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span className="font-bold text-lg">CreditWise AI</span>
  </div>
);
