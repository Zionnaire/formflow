'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/Logo';
import { FieldRenderer } from '@/components/editor/FieldRenderer';
import { api, ApiRequestError, type PublicShareView } from '@/lib/api';

const ROLE_LABEL: Record<PublicShareView['role'], string> = {
  owner: 'Applicant',
  field_supervisor: 'Field Supervisor',
  university_supervisor: 'University Supervisor',
  hod: 'Head of Department',
  guardian: 'Guardian',
  multi: 'Signatory',
};

/** The whole point of a share link: a no-login, token-scoped view onto exactly one section. */
export function DynamicSharedFillForm({ token }: { token: string }) {
  const [share, setShare] = useState<PublicShareView | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { share } = await api.resolveShare(token);
        if (!cancelled) setShare(share);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'This link could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const requiredMissing = useMemo(() => {
    if (!share) return [];
    return share.fields.filter((f) => f.required && f.type !== 'stamp' && f.type !== 'computed' && !values[f.id]?.trim());
  }, [share, values]);

  const suggestedSignature = useMemo(() => {
    if (!share) return undefined;
    const nameFields = share.fields.filter((f) => f.type === 'text' && /name/i.test(f.label));
    const combined = nameFields
      .map((f) => values[f.id])
      .filter(Boolean)
      .join(' ')
      .trim();
    return combined || undefined;
  }, [share, values]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (requiredMissing.length > 0) {
      setError(`Please fill in: ${requiredMissing.map((f) => f.label).join(', ')}.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.submitShare(token, values);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not submit this section. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col items-center py-xl px-margin">
      <header className="w-full max-w-3xl mb-lg text-center flex flex-col items-center">
        <div className="flex items-center gap-2 mb-md text-primary">
          <LogoMark size={36} />
          <h1 className="font-headline-md text-headline-md font-bold">FormFlow</h1>
        </div>
        {share && !submitted && (
          <>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-base">
              Filling {ROLE_LABEL[share.role]} Section for {share.studentName}
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">
              {share.studentName} has requested your help completing the &ldquo;{share.sectionLabel}&rdquo; section of
              their application. This section is secure and will only be shared with the application reviewers.
            </p>
          </>
        )}
      </header>

      {loading ? (
        <main className="w-full max-w-3xl flex items-center justify-center py-xl">
          <Icon name="progress_activity" className="text-primary text-4xl animate-spin" />
        </main>
      ) : error && !share ? (
        <main className="w-full max-w-3xl bg-surface-container-lowest rounded-lg shadow-card p-margin md:p-lg flex flex-col items-center text-center gap-md">
          <Icon name="link_off" className="text-error text-4xl" />
          <h2 className="font-headline-md text-headline-md text-on-surface">This link isn&apos;t available</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">{error}</p>
        </main>
      ) : submitted ? (
        <main className="w-full max-w-3xl bg-surface-container-lowest rounded-lg shadow-card p-margin md:p-lg flex flex-col items-center text-center gap-md">
          <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center">
            <Icon name="check_circle" filled className="text-primary text-4xl" />
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Section submitted</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            Thanks — your details for {share?.studentName}&apos;s application have been recorded. You can close this
            page.
          </p>
        </main>
      ) : share ? (
        <main className="w-full max-w-3xl bg-surface-container-lowest rounded-lg shadow-card p-margin md:p-lg">
          <form className="flex flex-col gap-lg" onSubmit={handleSubmit}>
            <div className="flex items-center gap-sm border-b border-surface-variant pb-base">
              <Icon name="assignment_ind" className="text-secondary" />
              <h3 className="font-headline-md text-headline-md text-on-surface">{share.sectionLabel}</h3>
            </div>

            {share.fields.length === 0 ? (
              <p className="text-on-surface-variant font-body-md text-body-md text-center py-lg">
                No fields were found for this section.
              </p>
            ) : (
              <div className="flex flex-col gap-md">
                {share.fields.map((field) => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={values[field.id] ?? ''}
                    onChange={(value) => setValues((prev) => ({ ...prev, [field.id]: value }))}
                    suggestedSignature={suggestedSignature}
                  />
                ))}
              </div>
            )}

            {error && (
              <p role="alert" className="font-label-sm text-label-sm text-error">
                {error}
              </p>
            )}

            <div className="flex justify-end mt-sm pt-md border-t border-surface-variant">
              <Button type="submit" variant="primary" className="rounded-full shadow-card" disabled={submitting}>
                <Icon name="send" />
                {submitting ? 'Submitting…' : 'Submit My Section'}
              </Button>
            </div>
          </form>
        </main>
      ) : null}

      <footer className="mt-xl text-center w-full max-w-3xl border-t border-surface-variant pt-lg">
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          © {new Date().getFullYear()} FormFlow. Built for students with care.
        </p>
        <div className="flex justify-center gap-md mt-sm">
          <a href="#" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
            Support
          </a>
        </div>
      </footer>
    </div>
  );
}
