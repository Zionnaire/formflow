'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/lib/auth-context';

/** Wrap any page that needs a logged-in user; redirects to /login otherwise. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex-grow flex items-center justify-center py-xl">
        <Icon name="progress_activity" className="text-primary text-4xl animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
