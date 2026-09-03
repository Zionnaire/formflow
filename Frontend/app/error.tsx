'use client';

import { useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console -- no client-side error reporting service wired up yet
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-margin py-xl gap-md text-center">
      <Logo height={40} />
      <Icon name="error" className="text-error text-5xl" />
      <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">Something went wrong</h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
        That&apos;s on us, not you — try again in a moment.
      </p>
      <Button variant="primary" className="rounded" onClick={reset}>
        <Icon name="refresh" />
        Try again
      </Button>
    </div>
  );
}
