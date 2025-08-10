
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

// This page is no longer needed and will redirect to the main credit analysis page.
// The authentication is now handled seamlessly on the credit page itself.
export default function LoginPage() {
  useEffect(() => {
    redirect('/credit');
  }, []);

  return null;
}
