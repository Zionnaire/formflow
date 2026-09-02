import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

export function HelpBanner() {
  return (
    <section className="mt-md bg-surface-container-low rounded-lg p-lg flex flex-col md:flex-row items-center justify-between gap-md shadow-card">
      <div className="flex items-center gap-md">
        <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
          <Icon name="lightbulb" className="text-primary text-3xl" />
        </div>
        <div>
          <h4 className="font-headline-md text-headline-md text-on-background text-xl mb-1">Need help getting started?</h4>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Upload a clear photo or PDF of your form. We&apos;ll extract the fields and auto-fill your saved details to
            save you time.
          </p>
        </div>
      </div>
      <Button variant="secondary" className="shrink-0 rounded">
        View Guide
      </Button>
    </section>
  );
}
