import mongoose from 'mongoose';
import { SubmissionModel, type ISubmission } from '../Models/Submission.model.js';
import { FormTemplateModel, type IFormTemplate } from '../Models/FormTemplate.model.js';
import { UserModel } from '../Models/User.model.js';
import { ApiError } from '../Utils/errors.js';
import { logger } from '../Middlewares/logger.js';
import { mapProfileToFields } from './groq.service.js';
import { downloadAsset, uploadDocument, getSignedUrl } from './cloudinary.service.js';
import { fillPdf, findMissingRequiredFields, type MissingField } from './pdf.service.js';

export async function createSubmission(formTemplateId: string, ownerId: string): Promise<ISubmission> {
  const template = await FormTemplateModel.findById(formTemplateId);
  if (!template) throw new ApiError(404, 'Form template not found', 'NOT_FOUND');

  const submission = await SubmissionModel.create({
    formTemplateId: template._id,
    ownerId: new mongoose.Types.ObjectId(ownerId),
    sections: {},
  });

  await FormTemplateModel.updateOne({ _id: template._id }, { $inc: { usageCount: 1 } });
  logger.info({ submissionId: submission._id.toString(), templateId: template._id.toString() }, 'Submission created');
  return submission;
}

export async function listSubmissionsForOwner(ownerId: string): Promise<ISubmission[]> {
  return SubmissionModel.find({ ownerId }).sort({ lastEditedAt: -1 }).populate('formTemplateId', 'title pageCount');
}

export async function getSubmissionForOwner(id: string, ownerId: string): Promise<ISubmission> {
  const submission = await SubmissionModel.findOne({ _id: id, ownerId });
  if (!submission) throw new ApiError(404, 'Submission not found', 'NOT_FOUND');
  return submission;
}

/**
 * Replaces a section's data, keeping its sibling fields (filledBy/completedAt/signatures).
 *
 * Deliberately does NOT spread the existing Mongoose subdocument (`{ ...existing, data }`) —
 * Mongoose subdocuments carry internal bookkeeping (`_doc`, `$__parent`, ...) as own-enumerable
 * properties, and casting a plain object built that way back into the Map causes Mongoose to
 * trust the stale `_doc` snapshot over the `data` key actually being set, silently keeping the
 * *old* data. Pulling only the named fields off `existing` avoids that trap.
 */
function setSectionData(submission: ISubmission, sectionId: string, data: Record<string, unknown>): void {
  const existing = submission.sections.get(sectionId);
  submission.sections.set(sectionId, {
    filledBy: existing?.filledBy,
    completedAt: existing?.completedAt,
    signatures: existing?.signatures,
    data,
  } as never);
}

/** Partial, resumable save — used for both manual edits and "save & continue later". */
export async function patchSubmissionSection(
  id: string,
  ownerId: string,
  sectionId: string,
  data: Record<string, unknown>,
): Promise<ISubmission> {
  const submission = await getSubmissionForOwner(id, ownerId);
  setSectionData(submission, sectionId, data);
  submission.lastEditedAt = new Date();
  await submission.save();
  return submission;
}

async function getSubmissionWithTemplate(id: string, ownerId: string): Promise<{ submission: ISubmission; template: IFormTemplate }> {
  const submission = await getSubmissionForOwner(id, ownerId);
  const template = await FormTemplateModel.findById(submission.formTemplateId);
  if (!template) throw new ApiError(404, 'Form template not found', 'NOT_FOUND');
  return { submission, template };
}

function ownerSectionId(template: IFormTemplate): string {
  return template.sections.find((s) => s.role === 'owner')?.sectionId ?? template.sections[0]?.sectionId ?? 'owner';
}

/** Maps the requesting user's saved profile onto the template's owner-section text/date fields. */
export async function autoFillSubmission(id: string, ownerId: string): Promise<ISubmission> {
  const { submission, template } = await getSubmissionWithTemplate(id, ownerId);
  const user = await UserModel.findById(ownerId);
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');

  const sectionId = ownerSectionId(template);
  const fillableFields = template.fieldSchema
    .filter((f) => f.sectionId === sectionId && (f.type === 'text' || f.type === 'date'))
    .map((f) => ({ id: f.id, label: f.label, type: f.type }));

  const mapping = await mapProfileToFields(
    { fullName: user.primaryProfile.fullName, ...user.primaryProfile, email: user.primaryProfile.email ?? user.email },
    fillableFields,
  );

  if (Object.keys(mapping).length > 0) {
    const existingData = submission.sections.get(sectionId)?.data ?? {};
    setSectionData(submission, sectionId, { ...existingData, ...mapping });
    submission.lastEditedAt = new Date();
    await submission.save();
  }

  return submission;
}

export interface ValidationResult {
  complete: boolean;
  missingFields: MissingField[];
}

/** Deterministic required-field presence check — no LLM call needed for exact-match validation. */
export async function validateSubmission(id: string, ownerId: string): Promise<ValidationResult> {
  const { submission, template } = await getSubmissionWithTemplate(id, ownerId);
  const missingFields = findMissingRequiredFields(template, submission);
  return { complete: missingFields.length === 0, missingFields };
}

export interface GenerateResult {
  submission: ISubmission;
  downloadUrl: string;
  missingFields: MissingField[];
}

/** Downloads the original PDF, overlays filled values, and re-uploads the result. */
export async function generateSubmissionPdf(id: string, ownerId: string): Promise<GenerateResult> {
  const { submission, template } = await getSubmissionWithTemplate(id, ownerId);

  const originalBytes = await downloadAsset(template.sourceCloudinaryId, 'raw');
  const filledBytes = await fillPdf(originalBytes, template, submission);
  const upload = await uploadDocument(Buffer.from(filledBytes), 'generated', `${submission._id.toString()}-filled`);
  const downloadUrl = getSignedUrl(upload.publicId, 'raw');

  const missingFields = findMissingRequiredFields(template, submission);
  submission.generatedPdfUrl = downloadUrl;
  submission.status = missingFields.length === 0 ? 'complete' : 'draft';
  submission.lastEditedAt = new Date();
  await submission.save();

  logger.info({ submissionId: id, missing: missingFields.length }, 'Submission PDF generated');
  return { submission, downloadUrl, missingFields };
}
