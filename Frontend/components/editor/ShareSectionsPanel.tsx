'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { api, ApiRequestError, type FormSectionDef, type PartyRole, type SectionShareStatus } from '@/lib/api';

const ROLE_LABEL: Record<PartyRole, string> = {
  owner: 'Applicant',
  field_supervisor: 'Field Supervisor',
  university_supervisor: 'University Supervisor',
  hod: 'Head of Department',
  guardian: 'Guardian',
  multi: 'Signatory',
};

/**
 * Lets the owner mint a no-login share link per non-owner section (brief section 7.3, step 3-4).
 * The organization/field supervisor's section(s) are always available once the student has their
 * own section going; every other section ("the school" — university supervisor, HOD, ...) stays
 * locked until every field_supervisor section is actually completed, matching the real paper
 * workflow this form follows (Backend's Services/share.service.ts listSharesForSubmission is the
 * source of truth for completion, not anything tracked only in this component).
 */
export function ShareSectionsPanel({ submissionId, sections }: { submissionId: string; sections: FormSectionDef[] }) {
  const [statusBySection, setStatusBySection] = useState<Record<string, SectionShareStatus>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailOpenId, setEmailOpenId] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentId, setEmailSentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { sections: statuses } = await api.listShares(submissionId);
        if (!cancelled) setStatusBySection(Object.fromEntries(statuses.map((s) => [s.sectionId, s])));
      } catch {
        // Non-fatal — the panel still works for creating new links, it just can't show
        // persisted completion status until this succeeds.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (sections.length === 0) return null;

  const fieldSupervisorSections = sections.filter((s) => s.role === 'field_supervisor');
  const schoolUnlocked =
    fieldSupervisorSections.length === 0 || fieldSupervisorSections.every((s) => statusBySection[s.sectionId]?.completedAt);

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

  async function handleEmailPdf(sectionId: string) {
    setEmailSending(true);
    setError(null);
    try {
      await api.emailSubmission(submissionId, emailTo);
      setEmailSentId(sectionId);
      setEmailOpenId(null);
      setEmailTo('');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not send the email.');
    } finally {
      setEmailSending(false);
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
          const isFieldSupervisor = section.role === 'field_supervisor';
          const locked = !isFieldSupervisor && !schoolUnlocked;
          const status = statusBySection[section.sectionId];
          const url = links[section.sectionId];
          const isDone = Boolean(status?.completedAt);

          return (
            <div
              key={section.sectionId}
              className={`flex flex-col sm:flex-row sm:items-center gap-sm p-sm rounded bg-surface-container-lowest border border-surface-dim/30 ${locked ? 'opacity-60' : ''}`}
            >
              <div className="flex-1">
                <p className="font-label-md text-label-md text-on-surface">{section.label}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{ROLE_LABEL[section.role] ?? section.role}</p>
                {locked && (
                  <p className="font-label-sm text-label-sm text-tertiary mt-0.5">Waiting on the organization supervisor first</p>
                )}
                {isDone && (
                  <p className="font-label-sm text-label-sm text-primary mt-0.5 flex items-center gap-1">
                    <Icon name="check_circle" className="text-[14px]" />
                    Completed
                  </p>
                )}
              </div>

              {locked ? (
                <Button type="button" variant="secondary" className="rounded-full shrink-0" disabled>
                  <Icon name="lock" className="text-[16px]" />
                  Locked
                </Button>
              ) : url ? (
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
                <div className="flex items-center gap-xs flex-wrap">
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full shrink-0"
                    onClick={() => handleCreate(section)}
                    disabled={loadingId === section.sectionId}
                  >
                    <Icon name="link" className="text-[16px]" />
                    {loadingId === section.sectionId ? 'Creating…' : status?.hasActiveShare ? 'Get a new link' : 'Get Link'}
                  </Button>

                  {!isFieldSupervisor && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-full shrink-0"
                      onClick={() => setEmailOpenId(emailOpenId === section.sectionId ? null : section.sectionId)}
                    >
                      <Icon name="mail" className="text-[16px]" />
                      Email the PDF instead
                    </Button>
                  )}
                </div>
              )}

              {emailOpenId === section.sectionId && (
                <div className="flex items-center gap-xs w-full sm:w-auto mt-xs sm:mt-0">
                  <input
                    type="email"
                    placeholder="school@example.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="bg-surface-container-low border border-outline-variant rounded px-2 py-1 text-xs w-48 sm:w-64"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full shrink-0"
                    onClick={() => handleEmailPdf(section.sectionId)}
                    disabled={emailSending || !emailTo.trim()}
                  >
                    {emailSending ? 'Sending…' : 'Send'}
                  </Button>
                </div>
              )}
              {emailSentId === section.sectionId && (
                <p className="font-label-sm text-label-sm text-primary">Sent — the school can download it from their email.</p>
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
