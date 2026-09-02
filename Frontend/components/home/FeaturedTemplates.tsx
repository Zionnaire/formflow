import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { featuredTemplates } from '@/lib/mock-data';

export function FeaturedTemplates() {
  return (
    <section className="flex flex-col gap-lg py-lg">
      <div className="text-center">
        <h2 className="font-headline-md text-headline-md text-on-background mb-xs">Featured Templates</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Recommended for your current academic cycle.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {featuredTemplates.map((t) => (
          <div
            key={t.id}
            className="bg-surface-container-low rounded-lg p-md shadow-card flex flex-col gap-md border border-transparent hover:border-primary-container/30 transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center">
                <Icon name={t.icon} className="text-primary text-3xl" />
              </div>
              <Badge tone={t.badgeTone}>{t.badge}</Badge>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-background text-xl mb-1">{t.title}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">{t.description}</p>
            </div>
            <Link href={`/forms/${t.id}/editor`} className="mt-auto">
              <Button variant="primary" className="w-full rounded">
                Quick Start
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
