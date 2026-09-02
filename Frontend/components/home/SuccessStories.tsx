import { Icon } from '@/components/ui/Icon';
import { testimonials } from '@/lib/mock-data';

export function SuccessStories() {
  return (
    <section className="flex flex-col gap-lg py-lg">
      <div className="text-center">
        <h2 className="font-headline-md text-headline-md text-on-background mb-xs">Success Stories</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          See how fellow students are saving time with FormFlow.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {testimonials.map((t) => (
          <div key={t.name} className="bg-surface-container-low rounded-lg p-md shadow-card flex flex-col gap-md">
            <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center">
              <Icon name="person" className="text-primary" />
            </div>
            <p className="font-body-md text-body-md text-on-surface italic">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-auto">
              <p className="font-label-md text-label-md text-on-background">{t.name}</p>
              <p className="text-xs text-on-surface-variant">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
