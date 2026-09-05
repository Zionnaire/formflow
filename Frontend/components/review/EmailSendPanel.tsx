'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { api, ApiRequestError } from '@/lib/api';

/** Lets the owner email the finished PDF straight to whoever needs it, once one's been generated. */
export function EmailSendPanel({ submissionId, disabled }: { submissionId: string; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await api.emailSubmission(submissionId, to, message.trim() || undefined);
      setSent(true);
      setTo('');
      setMessage('');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not send the email.');
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        className="w-full rounded-full"
        disabled={disabled}
        onClick={() => {
          setOpen(true);
          setSent(false);
        }}
      >
        <Icon name="mail" />
        Send via Email
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-sm p-md rounded-lg bg-surface-container-low border border-surface-variant">
      <div className="flex items-center justify-between">
        <h3 className="font-label-md text-label-md text-on-surface">Send via Email</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-on-surface">
          <Icon name="close" className="text-lg" />
        </button>
      </div>

      {sent ? (
        <p className="font-body-md text-body-md text-primary flex items-center gap-xs">
          <Icon name="check_circle" filled />
          Sent! You can send another copy below.
        </p>
      ) : null}

      <Input
        id="email-to"
        type="email"
        label="Recipient's email"
        placeholder="advisor@example.com"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <Textarea
        id="email-message"
        label="Message (optional)"
        placeholder="A short note to include with the PDF…"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {error && (
        <p role="alert" className="font-label-sm text-label-sm text-error">
          {error}
        </p>
      )}

      <Button type="button" variant="primary" className="rounded-full" onClick={handleSend} disabled={sending || !to.trim()}>
        <Icon name="send" />
        {sending ? 'Sending…' : 'Send'}
      </Button>
    </div>
  );
}
