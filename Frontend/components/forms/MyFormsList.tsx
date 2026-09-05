'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { FormCard } from '@/components/forms/FormCard';
import { api, ApiRequestError, type ApiSubmission, type ApiFormTemplate } from '@/lib/api';
import type { MyForm } from '@/lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function computeProgress(submission: ApiSubmission, template: ApiFormTemplate | undefined): number {
  if (!template) return submission.status === 'complete' ? 100 : 0;
  const ownerSection = template.sections.find((s) => s.role === 'owner') ?? template.sections[0];
  const fillable = template.fieldSchema.filter(
    (f) => f.sectionId === ownerSection?.sectionId && f.type !== 'stamp' && f.type !== 'computed',
  );
  if (fillable.length === 0) return submission.status === 'complete' ? 100 : 0;

  const data = submission.sections[ownerSection?.sectionId ?? '']?.data ?? {};
  const filled = fillable.filter((f) => data[f.id]?.trim()).length;
  return Math.round((filled / fillable.length) * 100);
}

export function MyFormsList() {
  const [forms, setForms] = useState<MyForm[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // formTemplateId comes back populated with everything needed below (title, fieldSchema,
        // sections) — no follow-up per-template fetch required (previously an N+1 round-trip
        // per unique template referenced by the list, which was the actual source of "My Forms"
        // loading slowly).
        const { submissions } = await api.listSubmissions();
        if (cancelled) return;

        setForms(
          submissions.map((s): MyForm => {
            const template = typeof s.formTemplateId === 'string' ? undefined : s.formTemplateId;
            return {
              id: s._id,
              templateTitle: template?.title ?? 'Untitled form',
              status: s.status,
              description:
                s.status === 'complete' ? 'All fields completed and ready to download.' : 'Continue filling out this form where you left off.',
              progress: computeProgress(s, template),
              department: 'My Upload',
              departmentIcon: 'upload_file',
              dateLabel: s.status === 'complete' ? `Submitted: ${formatDate(s.lastEditedAt)}` : `Last edited: ${formatDate(s.lastEditedAt)}`,
            };
          }),
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Could not load your forms.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-error font-body-md text-body-md py-lg text-center">{error}</p>;
  }

  if (forms === null) {
    return (
      <div className="flex justify-center py-lg">
        <Icon name="progress_activity" className="text-primary text-3xl animate-spin" />
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <p className="text-on-surface-variant font-body-md text-body-md py-lg text-center">
        You haven&apos;t uploaded any forms yet — try &ldquo;Upload new form&rdquo; from the Home page.
      </p>
    );
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
      {forms.map((form) => (
        <FormCard key={form.id} form={form} />
      ))}
    </section>
  );
}
