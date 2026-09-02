import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Icon } from '@/components/ui/Icon';
import { DocumentPreview } from '@/components/review/DocumentPreview';
import { DownloadButton } from '@/components/review/DownloadButton';
import { resolveFormTitle } from '@/lib/mock-data';

export default async function ReviewPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const title = resolveFormTitle(formId);

  return (
    <PageShell>
      <RequireAuth>
        <main className="flex-grow max-w-7xl mx-auto w-full px-margin py-lg md:py-xl flex flex-col items-center">
          <div className="text-center mb-lg max-w-2xl">
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-sm">
              Ready to wrap up?
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Review your completed form below. Once everything looks good, you can download your official PDF ready
              for submission.
            </p>
          </div>

          <div className="bg-tertiary-fixed text-on-tertiary-fixed p-md rounded-lg mb-lg max-w-3xl w-full flex items-start gap-sm shadow-card border border-tertiary-fixed-dim/20">
            <Icon name="warning" filled className="text-tertiary mt-1" />
            <div>
              <h3 className="font-label-md text-label-md font-bold mb-xs">Almost there!</h3>
              <p className="font-body-md text-body-md text-on-tertiary-fixed-variant">
                You&apos;ve missed a few non-required fields. You can still download, but we recommend filling them
                for a complete application.
              </p>
            </div>
            <Link
              href={`/forms/${formId}/editor`}
              className="ml-auto font-label-sm text-label-sm text-tertiary underline hover:text-on-tertiary-fixed transition-colors shrink-0"
            >
              Review fields
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter w-full max-w-5xl">
            <DocumentPreview />

            <div className="lg:col-span-4 flex flex-col gap-md">
              <div className="bg-surface-container-lowest rounded-lg shadow-card p-md flex flex-col gap-md border border-surface-dim/30">
                <div className="flex items-center gap-sm mb-sm">
                  <Icon name="description" className="text-primary text-3xl" />
                  <div>
                    <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Completed just now</p>
                  </div>
                </div>

                <DownloadButton />

                <Link
                  href={`/forms/${formId}/editor`}
                  className="w-full flex justify-center items-center gap-xs text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md py-sm"
                >
                  <Icon name="edit" className="text-sm" />
                  Edit again
                </Link>
              </div>

              <div className="bg-surface-container-low rounded-lg p-md flex flex-col gap-sm border border-surface-dim/20">
                <h3 className="font-label-md text-label-md text-on-surface mb-xs">What happens next?</h3>
                <ul className="flex flex-col gap-sm font-body-md text-body-md text-on-surface-variant">
                  <li className="flex items-start gap-xs">
                    <Icon name="print" className="text-secondary text-sm mt-1" />
                    <span>Print your document if a physical copy is required.</span>
                  </li>
                  <li className="flex items-start gap-xs">
                    <Icon name="mail" className="text-secondary text-sm mt-1" />
                    <span>Email the downloaded PDF directly to your advisor.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </RequireAuth>
    </PageShell>
  );
}
