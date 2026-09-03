'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { api, ApiRequestError, type FormSectionDef, type PartyRole } from '@/lib/api';

const ROLE_LABEL: Record<PartyRole, string> = {
  owner: 'Applicant',
  field_supervisor: 'Field Supervisor',
  university_supervisor: 'University Supervisor',
  hod: 'Head of Department',
  guardian: 'Guardian',
  multi: 'Signatory',
};

/** Lets the owner mint a no-login share link per non-owner section (brief section 7.3, step 3-4). */
export function ShareSectionsPanel({ submissionId, sections }: { submissionId: string; sections: FormSectionDef[] }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (sections.length === 0) return null;

  async function handleCreate(section: FormSectionDef) {
    setLoadingId(section.sectionId);
    setError(null);
    try {
      const { url } = await api.createShare(submissionId, section.sectionId, section.role);
      setLinks((prev) => ({ ...prev, [section.sectionId]: url }));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not create a share link.');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCopy(url: string, sectionId: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(sectionId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API can be unavailable (permissions, non-secure context) — the link is
      // still visible in the read-only input for a manual copy.
    }
  }

  return (
    <div className="w-full bg-surface-container-low rounded-lg p-lg mt-lg border border-surface-variant">
      <div className="flex items-center gap-sm mb-md">
        <Icon name="share" className="text-secondary" />
        <h3 className="font-headline-md text-headline-md text-on-surface">Request Signatures</h3>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mb-md">
        This form has sections someone else needs to fill in. Generate a link for each and send it their way — no
        account needed on their end.
      </p>

      <div className="flex flex-col gap-sm">
        {sections.map((section) => {
          const url = links[section.sectionId];
          return (
            <div
              key={section.sectionId}
              className="flex flex-col sm:flex-row sm:items-center gap-sm p-sm rounded bg-surface-container-lowest border border-surface-dim/30"
            >
              <div className="flex-1">
                <p className="font-label-md text-label-md text-on-surface">{section.label}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{ROLE_LABEL[section.role] ?? section.role}</p>
              </div>
              {url ? (
                <div className="flex items-center gap-xs">
                  <input
                    readOnly
                    value={url}
                    onFocus={(e) => e.target.select()}
                    className="bg-surface-container-low border border-outline-variant rounded px-2 py-1 text-xs w-48 sm:w-64 truncate"
                  />
                  <Button type="button" variant="secondary" className="rounded-full shrink-0" onClick={() => handleCopy(url, section.sectionId)}>
                    <Icon name={copiedId === section.sectionId ? 'check' : 'content_copy'} className="text-[16px]" />
                    {copiedId === section.sectionId ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full shrink-0"
                  onClick={() => handleCreate(section)}
                  disabled={loadingId === section.sectionId}
                >
                  <Icon name="link" className="text-[16px]" />
                  {loadingId === section.sectionId ? 'Creating…' : 'Get Link'}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="font-label-sm text-label-sm text-error mt-sm">
          {error}
        </p>
      )}
    </div>
  );
}
