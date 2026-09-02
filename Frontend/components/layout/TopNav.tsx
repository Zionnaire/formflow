'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { LogoMark } from '@/components/ui/Logo';
import { studentAvatarUrl } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/forms', label: 'My Forms' },
  { href: '/profile', label: 'Profile' },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 shadow-sm bg-background w-full">
      <div className="flex justify-between items-center w-full px-margin py-base max-w-7xl mx-auto">
        <Link href="/" className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2">
          <LogoMark size={28} />
          FormFlow
        </Link>

        <nav className="hidden md:flex gap-md items-center font-label-md text-label-md">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'pb-1 px-sm py-xs rounded-lg transition-colors',
                  isActive
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-sm">
          <button
            className="md:hidden text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-all active:scale-95"
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>
          <Link
            href="/profile"
            className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant hover:shadow-md transition-all block"
          >
            <Image src={studentAvatarUrl} alt="Student profile picture" width={40} height={40} className="w-full h-full object-cover" />
          </Link>
        </div>
      </div>
    </header>
  );
}
