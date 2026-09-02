import { randomBytes } from 'crypto';
import { ShareModel, type IShare } from '../Models/Share.model.js';
import { SubmissionModel } from '../Models/Submission.model.js';
import { ApiError } from '../Utils/errors.js';
import { env } from '../config/env.js';
import { logger } from '../Middlewares/logger.js';
import type { PartyRole } from '../Types/index.js';

export async function createShare(submissionId: string, sectionId: string, role: PartyRole): Promise<IShare> {
  const submission = await SubmissionModel.findById(submissionId);
  if (!submission) throw new ApiError(404, 'Submission not found', 'NOT_FOUND');

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + env.SHARE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const share = await ShareModel.create({ submissionId: submission._id, sectionId, token, role, expiresAt });
  logger.info({ shareId: share._id.toString(), submissionId }, 'Share link created');
  return share;
}

export function buildShareUrl(token: string): string {
  return `${env.FRONTEND_URL}/fill/${token}`;
}

export async function resolveShare(token: string): Promise<IShare> {
  const share = await ShareModel.findOne({ token });
  if (!share) throw new ApiError(404, 'This link is invalid or has expired', 'NOT_FOUND');
  if (share.usedAt) throw new ApiError(410, 'This section has already been submitted', 'CONFLICT');
  return share;
}

export async function submitShareSection(token: string, data: Record<string, unknown>): Promise<void> {
  const share = await resolveShare(token);

  const submission = await SubmissionModel.findById(share.submissionId);
  if (!submission) throw new ApiError(404, 'Submission not found', 'NOT_FOUND');

  submission.sections.set(share.sectionId, {
    data,
    completedAt: new Date(),
  } as never);
  submission.lastEditedAt = new Date();
  await submission.save();

  share.usedAt = new Date();
  await share.save();

  logger.info({ shareId: share._id.toString(), sectionId: share.sectionId }, 'Shared section submitted');
}
