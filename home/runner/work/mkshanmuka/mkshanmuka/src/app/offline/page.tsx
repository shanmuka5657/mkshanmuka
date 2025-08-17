
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
      <WifiOff className="h-24 w-24 text-muted-foreground mb-4" />
      <h1 className="text-3xl font-bold mb-2">You are Offline</h1>
      <p className="text-muted-foreground max-w-md">
        It seems you've lost your internet connection. This page is limited, but some features may still be available once you're back online.
      </p>
    </div>
  );
}
