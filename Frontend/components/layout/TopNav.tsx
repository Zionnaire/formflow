'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { LogoMark } from '@/components/ui/Logo';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/forms', label: 'My Forms' },
  { href: '/profile', label: 'Profile' },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push('/');
  }

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
          {loading ? (
            <div className="w-10 h-10 rounded-full bg-surface-container-high animate-pulse" />
          ) : user ? (
            <>
              <button
                onClick={handleLogout}
                className="hidden md:inline-flex font-label-md text-label-md text-on-surface-variant hover:text-primary px-sm py-xs rounded-lg hover:bg-surface-container-low transition-colors"
              >
                Log out
              </button>
              <Link
                href="/profile"
                className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant hover:shadow-md transition-all flex items-center justify-center"
              >
                {user.mediaAssets?.passportPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, unpredictable source
                  <img src={user.mediaAssets.passportPhotoUrl} alt="Profile picture" className="w-full h-full object-cover" />
                ) : (
                  <Icon name="person" className="text-on-surface-variant" />
                )}
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-primary text-on-primary font-label-md text-label-md px-4 py-2 rounded-full hover:bg-surface-tint transition-colors"
            >
              Log In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
