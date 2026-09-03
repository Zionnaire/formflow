import { randomBytes } from 'crypto';
import { ShareModel, type IShare } from '../Models/Share.model.js';
import { SubmissionModel } from '../Models/Submission.model.js';
import { FormTemplateModel } from '../Models/FormTemplate.model.js';
import { UserModel } from '../Models/User.model.js';
import { ApiError } from '../Utils/errors.js';
import { env } from '../config/env.js';
import { logger } from '../Middlewares/logger.js';
import type { PartyRole, FieldDefinition } from '../Types/index.js';

export async function createShare(submissionId: string, ownerId: string, sectionId: string, role: PartyRole): Promise<IShare> {
  // Scoped by ownerId — without this, any authenticated user could mint a share link for
  // somebody else's submission just by guessing/knowing its id.
  const submission = await SubmissionModel.findOne({ _id: submissionId, ownerId });
  if (!submission) throw new ApiError(404, 'Submission not found', 'NOT_FOUND');

  const template = await FormTemplateModel.findById(submission.formTemplateId);
  if (!template?.sections.some((s) => s.sectionId === sectionId)) {
    throw new ApiError(400, 'That section does not exist on this form', 'VALIDATION_ERROR');
  }

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

export interface PublicShareView {
  sectionId: string;
  sectionLabel: string;
  role: PartyRole;
  studentName: string;
  fields: FieldDefinition[];
  expiresAt: Date;
}

/**
 * Everything a guest filling a shared section needs, resolved server-side from the trusted
 * share token — the guest is never authenticated, so this can't route through the owner-scoped
 * /templates or /submissions endpoints (brief section 2: "no login required").
 */
export async function getPublicShareView(token: string): Promise<PublicShareView> {
  const share = await resolveShare(token);

  const submission = await SubmissionModel.findById(share.submissionId);
  if (!submission) throw new ApiError(404, 'Submission not found', 'NOT_FOUND');

  const [template, owner] = await Promise.all([
    FormTemplateModel.findById(submission.formTemplateId),
    UserModel.findById(submission.ownerId),
  ]);
  if (!template) throw new ApiError(404, 'Form template not found', 'NOT_FOUND');

  const section = template.sections.find((s) => s.sectionId === share.sectionId);

  return {
    sectionId: share.sectionId,
    sectionLabel: section?.label ?? 'Your section',
    role: share.role,
    studentName: owner?.primaryProfile.fullName?.trim() || owner?.email || 'the student',
    fields: template.fieldSchema.filter((f) => f.sectionId === share.sectionId),
    expiresAt: share.expiresAt,
  };
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
