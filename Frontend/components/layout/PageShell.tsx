import type { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { Footer } from './Footer';

/** Shared chrome for the "logged-in" surfaces: Home, My Forms, Profile, Media Manager, Review. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <div className="flex-grow flex flex-col">{children}</div>
      <Footer />
    </div>
  );
}
