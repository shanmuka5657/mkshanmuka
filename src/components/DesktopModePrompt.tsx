
'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { MonitorSmartphone } from 'lucide-react';

export function DesktopModePrompt() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show the prompt if on mobile and if it hasn't been dismissed this session
    if (isMobile && sessionStorage.getItem('desktopPromptDismissed') !== 'true') {
      setIsOpen(true);
    }
  }, [isMobile]);

  const handleDismiss = () => {
    sessionStorage.setItem('desktopPromptDismissed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
             <MonitorSmartphone className="h-12 w-12 text-primary" />
          </div>
          <AlertDialogTitle className="text-center">Switch to Desktop for the Best Experience</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            CreditWise AI is designed for larger screens. For full functionality and a better view of your data, we recommend using a desktop browser.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel onClick={handleDismiss}>Stay on Mobile</AlertDialogCancel>
          <AlertDialogAction onClick={handleDismiss}>I'll Switch Later</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
