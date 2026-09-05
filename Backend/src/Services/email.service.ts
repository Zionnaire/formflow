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
