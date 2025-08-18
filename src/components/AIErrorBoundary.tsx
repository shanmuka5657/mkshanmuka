'use client';

import { ReactNode } from 'react';

export function AIErrorBoundary({ children }: { children: ReactNode }) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('AI component error:', error);
    return (
      <div className="ai-error">
        <h3>AI Service Temporarily Unavailable</h3>
        <p>We're experiencing issues with our AI services. Please try again later.</p>
      </div>
    );
  }
}