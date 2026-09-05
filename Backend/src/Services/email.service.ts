import { mailer } from '../config/mailer.js';
import { env } from '../config/env.js';
import { logger } from '../Middlewares/logger.js';
import { ApiError } from '../Utils/errors.js';

export interface SendFormEmailInput {
  to: string;
  senderName: string;
  formTitle: string;
  message?: string;
  attachment: { filename: string; content: Buffer };
}

/** Emails the finished, filled-in PDF to whoever the student needs to send it to. */
export async function sendFormEmail(input: SendFormEmailInput): Promise<void> {
  if (!mailer) {
    throw new ApiError(503, 'Email sending is not configured on this server', 'NOT_IMPLEMENTED');
  }

  const { to, senderName, formTitle, message, attachment } = input;
  const greeting = message?.trim()
    ? message.trim()
    : `${senderName} has sent you a completed copy of "${formTitle}" via FormFlow. It's attached as a PDF.`;

  await mailer.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `${senderName} sent you "${formTitle}"`,
    text: greeting,
    attachments: [{ filename: attachment.filename, content: attachment.content, contentType: 'application/pdf' }],
  });

  logger.info({ to, formTitle }, 'Submission emailed');
}

/**
 * Lets the student know a shared section has just been filled in, without them needing to poll
 * or reload — fired from Services/share.service.ts submitShareSection, right after a guest (the
 * organization or university supervisor, filling with no FormFlow account of their own) submits
 * their section. Deliberately never throws: unlike sendFormEmail (an explicit, student-initiated
 * action the caller needs to know failed), this is a side-effect of someone else's submit — a
 * missing/broken mailer config should never fail *their* request, just skip the notification.
 */
export async function notifySectionCompleted(to: string, formTitle: string, sectionLabel: string): Promise<void> {
  if (!mailer) {
    logger.info({ to, formTitle, sectionLabel }, 'Section completed (notification email skipped — SMTP not configured)');
    return;
  }

  try {
    await mailer.sendMail({
      from: env.SMTP_FROM,
      to,
      subject: `"${sectionLabel}" has been filled in on "${formTitle}"`,
      text: `Good news — ${sectionLabel} of "${formTitle}" has just been completed. Log in to FormFlow to see it and continue your submission.`,
    });
    logger.info({ to, formTitle, sectionLabel }, 'Section-completed notification sent');
  } catch (err) {
    logger.error({ err, to, formTitle, sectionLabel }, 'Failed to send section-completed notification');
  }
}
