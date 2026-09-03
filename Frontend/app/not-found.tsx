import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-margin py-xl gap-md text-center">
      <Logo height={40} />
      <Icon name="search_off" className="text-outline text-5xl" />
      <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">Page not found</h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
        The page you&apos;re looking for doesn&apos;t exist, or may have moved.
      </p>
      <Link href="/">
        <Button variant="primary" className="rounded">
          <Icon name="home" />
          Back to Home
        </Button>
      </Link>
    </div>
  );
}
