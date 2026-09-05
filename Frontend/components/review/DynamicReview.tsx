'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { DocumentPreview } from '@/components/review/DocumentPreview';
import { api, ApiRequestError, type ApiSubmission, type ValidationResult } from '@/lib/api';

export function DynamicReview({ submissionId }: { submissionId: string }) {
  const [submission, setSubmission] = useState<ApiSubmission | null>(null);
  const [title, setTitle] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ submission }, validationResult] = await Promise.all([
          api.getSubmission(submissionId),
          api.validateSubmission(submissionId),
        ]);
        if (cancelled) return;
        setSubmission(submission);
        setValidation(validationResult);
        if (submission.generatedPdfUrl) setDownloadUrl(submission.generatedPdfUrl);

        const templateId = typeof submission.formTemplateId === 'string' ? submission.formTemplateId : submission.formTemplateId._id;
        const { template } = await api.getTemplate(templateId);
        if (!cancelled) setTitle(template.title);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Could not load this submission.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await api.generateSubmission(submissionId);
      setDownloadUrl(result.downloadUrl);
      setValidation({ complete: result.missingFields.length === 0, missingFields: result.missingFields });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not generate the PDF.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-grow flex items-center justify-center py-xl">
        <Icon name="progress_activity" className="text-primary text-4xl animate-spin" />
      </main>
    );
  }

  if (error && !submission) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center gap-md py-xl text-center px-margin">
        <Icon name="error" className="text-error text-4xl" />
        <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">{error}</p>
        <Link href="/forms" className="text-primary font-label-md text-label-md hover:underline">
          Back to My Forms
        </Link>
      </main>
    );
  }

  if (!submission) return null;

  const missingFields = validation?.missingFields ?? [];

  return (
    <main className="flex-grow max-w-7xl mx-auto w-full px-margin py-lg md:py-xl flex flex-col items-center">
      <div className="text-center mb-lg max-w-2xl">
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-sm">Ready to wrap up?</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Review your completed form below. Once everything looks good, generate your official PDF ready for submission.
        </p>
      </div>

      {validation && !validation.complete && (
        <div className="bg-tertiary-fixed text-on-tertiary-fixed p-md rounded-lg mb-lg max-w-3xl w-full flex items-start gap-sm shadow-card border border-tertiary-fixed-dim/20">
          <Icon name="warning" filled className="text-tertiary mt-1" />
          <div>
            <h3 className="font-label-md text-label-md font-bold mb-xs">Almost there!</h3>
            <p className="font-body-md text-body-md text-on-tertiary-fixed-variant">
              You&apos;re missing {missingFields.length} required {missingFields.length === 1 ? 'field' : 'fields'}:{' '}
              {missingFields.map((f) => f.label).join(', ')}.
            </p>
          </div>
          <Link
            href={`/forms/${submissionId}/editor`}
            className="ml-auto font-label-sm text-label-sm text-tertiary underline hover:text-on-tertiary-fixed transition-colors shrink-0"
          >
            Review fields
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter w-full max-w-5xl">
        <DocumentPreview pdfUrl={downloadUrl ?? undefined} />

        <div className="lg:col-span-4 flex flex-col gap-md">
          <div className="bg-surface-container-lowest rounded-lg shadow-card p-md flex flex-col gap-md border border-surface-dim/30">
            <div className="flex items-center gap-sm mb-sm">
              <Icon name="description" className="text-primary text-3xl" />
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">{title || 'Your form'}</h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {submission.status === 'complete' ? 'Complete' : 'In progress'}
                </p>
              </div>
            </div>

            {downloadUrl ? (
              <a href={downloadUrl} target="_blank" rel="noreferrer">
                <Button variant="primary" className="w-full rounded-full shadow-card">
                  <Icon name="download" filled />
                  Download Filled PDF
                </Button>
              </a>
            ) : (
              <Button variant="primary" className="w-full rounded-full shadow-card" onClick={handleGenerate} disabled={generating}>
                <Icon name="picture_as_pdf" />
                {generating ? 'Generating…' : 'Generate PDF'}
              </Button>
            )}
            {error && (
              <p role="alert" className="font-label-sm text-label-sm text-error text-center">
                {error}
              </p>
            )}

            <Link
              href={`/forms/${submissionId}/editor`}
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
  );
}
