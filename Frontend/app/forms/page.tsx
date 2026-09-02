import { PageShell } from '@/components/layout/PageShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { FormCard } from '@/components/forms/FormCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { myForms } from '@/lib/mock-data';

export const metadata = { title: 'FormFlow - My Forms' };

export default function MyFormsPage() {
  return (
    <PageShell>
      <RequireAuth>
        <main className="flex-grow w-full max-w-7xl mx-auto px-margin py-lg flex flex-col gap-lg">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
                My Forms
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 max-w-2xl">
                Pick up where you left off or review your completed submissions. Your progress is always saved.
              </p>
            </div>
            <Button variant="primary" className="rounded">
              <Icon name="add" className="text-[20px]" />
              New Form
            </Button>
          </header>

          {myForms.length === 0 ? (
            <p className="text-on-surface-variant font-body-md text-body-md py-lg text-center">
              You haven&apos;t started any forms yet.
            </p>
          ) : (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
              {myForms.map((form) => (
                <FormCard key={form.id} form={form} />
              ))}
            </section>
          )}
        </main>
      </RequireAuth>
    </PageShell>
  );
}
