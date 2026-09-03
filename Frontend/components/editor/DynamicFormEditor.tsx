'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { EditorSideNav } from '@/components/editor/EditorSideNav';
import { FieldRenderer } from '@/components/editor/FieldRenderer';
import { ShareSectionsPanel } from '@/components/editor/ShareSectionsPanel';
import { api, ApiRequestError, type ApiSubmission, type ApiFormTemplate } from '@/lib/api';

function flattenSections(submission: ApiSubmission): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const section of Object.values(submission.sections)) {
    Object.assign(flat, section.data);
  }
  return flat;
}

/** The real, schema-driven editor for a submission created via the upload -> extract-fields pipeline. */
export function DynamicFormEditor({ submissionId }: { submissionId: string }) {
  const [submission, setSubmission] = useState<ApiSubmission | null>(null);
  const [template, setTemplate] = useState<ApiFormTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoFilling, setAutoFilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [suggestingFieldId, setSuggestingFieldId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { submission } = await api.getSubmission(submissionId);
        const templateId = typeof submission.formTemplateId === 'string' ? submission.formTemplateId : submission.formTemplateId._id;
        const { template } = await api.getTemplate(templateId);
        if (cancelled) return;
        setSubmission(submission);
        setTemplate(template);
        setValues(flattenSections(submission));
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Could not load this form.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const ownerSection = template?.sections.find((s) => s.role === 'owner') ?? template?.sections[0];
  const ownerFields = useMemo(
    () => template?.fieldSchema.filter((f) => f.sectionId === ownerSection?.sectionId) ?? [],
    [template, ownerSection],
  );
  const otherSections = useMemo(
    () => template?.sections.filter((s) => s.sectionId !== ownerSection?.sectionId) ?? [],
    [template, ownerSection],
  );

  const fillableFields = ownerFields.filter((f) => f.type !== 'stamp' && f.type !== 'computed');
  const filledCount = fillableFields.filter((f) => values[f.id]?.trim()).length;
  const progress = fillableFields.length === 0 ? 0 : Math.round((filledCount / fillableFields.length) * 100);

  const suggestedSignature = useMemo(() => {
    const nameFields = ownerFields.filter((f) => f.type === 'text' && /name/i.test(f.label));
    const combined = nameFields
      .map((f) => values[f.id])
      .filter(Boolean)
      .join(' ')
      .trim();
    return combined || undefined;
  }, [ownerFields, values]);

  function updateField(id: string, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
  }

  async function handleAutoFill() {
    if (!submission) return;
    setAutoFilling(true);
    setError(null);
    try {
      const { submission: updated } = await api.autoFillSubmission(submission._id);
      setSubmission(updated);
      setValues(flattenSections(updated));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Auto-fill failed.');
    } finally {
      setAutoFilling(false);
    }
  }

  async function handleSuggest(fieldId: string) {
    if (!submission) return;
    setSuggestingFieldId(fieldId);
    setError(null);
    try {
      const { value } = await api.suggestField(submission._id, fieldId);
      updateField(fieldId, value);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not get an AI suggestion for this field.');
    } finally {
      setSuggestingFieldId(null);
    }
  }

  async function handleSaveProgress() {
    if (!submission || !ownerSection) return;
    setSaving(true);
    setError(null);
    try {
      const sectionData: Record<string, string> = {};
      for (const field of ownerFields) {
        const value = values[field.id];
        if (value !== undefined) sectionData[field.id] = value;
      }
      await api.patchSection(submission._id, ownerSection.sectionId, sectionData);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save your progress.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-screen">
        <Icon name="progress_activity" className="text-primary text-4xl animate-spin" />
      </main>
    );
  }

  if (error && !submission) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-screen gap-md text-center px-margin">
        <Icon name="error" className="text-error text-4xl" />
        <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">{error}</p>
        <Link href="/forms" className="text-primary font-label-md text-label-md hover:underline">
          Back to My Forms
        </Link>
      </main>
    );
  }

  if (!submission || !template) return null;

  return (
    <main className="flex-1 w-full md:w-[calc(100%-20rem)] flex flex-col min-h-screen pb-24 md:pb-0 pt-16 md:pt-0 relative overflow-y-auto">
      <EditorSideNav
        progress={progress}
        onAutoFill={handleAutoFill}
        onSaveProgress={handleSaveProgress}
        saved={saved}
        saving={saving}
        autoFilling={autoFilling}
      />

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-lg py-lg md:py-xl flex flex-col items-center">
        <div className="w-full text-center mb-lg">
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-base">{template.title}</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            {template.pageCount} {template.pageCount === 1 ? 'page' : 'pages'} &bull; Please fill out all required fields.
          </p>
        </div>

        <div className="w-full bg-surface-container-lowest rounded-lg shadow-card p-lg sm:p-xl relative overflow-hidden">
          {autoFilling && (
            <div className="absolute inset-0 bg-surface-container-lowest/70 backdrop-blur-sm z-20 flex items-center justify-center">
              <Icon name="progress_activity" className="text-primary text-3xl animate-spin" />
            </div>
          )}
          <form className="relative z-10 space-y-md w-full" onSubmit={(e) => e.preventDefault()}>
            {fillableFields.length === 0 ? (
              <p className="text-on-surface-variant font-body-md text-body-md text-center py-lg">
                No fields were detected for this form yet.
              </p>
            ) : (
              ownerFields.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={values[field.id] ?? ''}
                  onChange={(value) => updateField(field.id, value)}
                  suggestedSignature={suggestedSignature}
                  onSuggest={field.type === 'text' || field.type === 'long_text_ruled' ? handleSuggest : undefined}
                  suggesting={suggestingFieldId === field.id}
                />
              ))
            )}

            {error && (
              <p role="alert" className="font-label-sm text-label-sm text-error">
                {error}
              </p>
            )}
          </form>
        </div>

        <ShareSectionsPanel submissionId={submission._id} sections={otherSections} />

        <Link href={`/forms/${submission._id}/review`} className="mt-lg">
          <Button variant="primary" className="rounded-full shadow-card">
            Continue to Review
            <Icon name="arrow_forward" />
          </Button>
        </Link>
      </div>
    </main>
  );
}
