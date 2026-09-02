import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-margin py-xl">
      <Link href="/" className="mb-lg">
        <Logo height={44} />
      </Link>
      <div className="w-full max-w-md bg-surface-container-lowest rounded-lg shadow-card p-lg sm:p-xl">
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">{title}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-lg">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
