import nodemailer from 'nodemailer';
import { env } from './env.js';

/** Undefined until SMTP_* is configured — Services/email.service.ts checks this before sending. */
export const mailer = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : undefined;
