import mongoose from 'mongoose';
import { SubmissionModel, type ISubmission } from '../Models/Submission.model.js';
import { FormTemplateModel, type IFormTemplate } from '../Models/FormTemplate.model.js';
import { UserModel } from '../Models/User.model.js';
import { ApiError } from '../Utils/errors.js';
import { logger } from '../Middlewares/logger.js';
import { mapProfileToFields, draftWriteups, suggestSingleFieldValue } from './groq.service.js';
import { downloadAsset, uploadDocument, getSignedUrl } from './cloudinary.service.js';
import { fillPdf, findMissingRequiredFields, type MissingField } from './pdf.service.js';
import { sendFormEmail } from './email.service.js';

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

/**
 * Populates everything MyFormsList needs to compute each card's title and progress percentage
 * (title, fieldSchema, sections) in this one query — it used to populate only title/pageCount,
 * forcing the frontend into a follow-up GET /templates/:id per *unique* template referenced by
 * the list (an N+1 round-trip pattern that was the actual cause of "My Forms" loading slowly).
 */
export async function listSubmissionsForOwner(ownerId: string): Promise<ISubmission[]> {
  return SubmissionModel.find({ ownerId })
    .sort({ lastEditedAt: -1 })
    .populate('formTemplateId', 'title pageCount fieldSchema sections');
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

async function getSubmissionWithTemplate(id: string, ownerId: string): Promise<{ submission: ISubmission; template: IFormTemplate }> {
  const submission = await getSubmissionForOwner(id, ownerId);
  const template = await FormTemplateModel.findById(submission.formTemplateId);
  if (!template) throw new ApiError(404, 'Form template not found', 'NOT_FOUND');
  return { submission, template };
}

function ownerSectionId(template: IFormTemplate): string {
  return template.sections.find((s) => s.role === 'owner')?.sectionId ?? template.sections[0]?.sectionId ?? 'owner';
}

/**
 * Partial, resumable save — used for both manual edits and "save & continue later". Scoped to the
 * template's own owner section: every other section (field_supervisor, university_supervisor,
 * hod, multi, ...) is filled exclusively through that party's own share link
 * (Services/share.service.ts submitShareSection), never through the student's own authenticated
 * session — otherwise the student could silently write into the organization or school's part of
 * the form, which defeats the point of having separate reviewers at all.
 */
export async function patchSubmissionSection(
  id: string,
  ownerId: string,
  sectionId: string,
  data: Record<string, unknown>,
): Promise<ISubmission> {
  const { submission, template } = await getSubmissionWithTemplate(id, ownerId);
  if (sectionId !== ownerSectionId(template)) {
    throw new ApiError(403, "You can only fill in your own section of this form — the rest is filled by whoever it's shared with", 'INSUFFICIENT_PERMISSIONS');
  }
  setSectionData(submission, sectionId, data);
  submission.lastEditedAt = new Date();
  await submission.save();
  return submission;
}

/**
 * Auto-fills the template's owner-section fields in two passes: maps the user's saved profile
 * onto plain text/date fields (brief section 8, step 2), then drafts starter prose for the
 * long-form write-up fields (Introduction, Duties, Challenges, …) grounded in the profile plus
 * whatever the first pass just filled in — e.g. the internship's organization name and dates.
 * Never overwrites a field the student has already filled in by hand.
 */
export async function autoFillSubmission(id: string, ownerId: string): Promise<ISubmission> {
  const { submission, template } = await getSubmissionWithTemplate(id, ownerId);
  const user = await UserModel.findById(ownerId);
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');

  const sectionId = ownerSectionId(template);
  const existingData = submission.sections.get(sectionId)?.data ?? {};
  const profile = { fullName: user.primaryProfile.fullName, ...user.primaryProfile, email: user.primaryProfile.email ?? user.email };

  const mappableFields = template.fieldSchema
    .filter((f) => f.sectionId === sectionId && (f.type === 'text' || f.type === 'date') && !isFilled(existingData[f.id]))
    .map((f) => ({ id: f.id, label: f.label, type: f.type }));
  const mapping = await mapProfileToFields(profile, mappableFields);

  const mergedData = { ...existingData, ...mapping };

  const writeupFields = template.fieldSchema
    .filter((f) => f.sectionId === sectionId && f.type === 'long_text_ruled' && !isFilled(mergedData[f.id]))
    .map((f) => ({ id: f.id, label: f.label, helpText: f.helpText, ruledLineCount: f.ruledLineCount }));
  const drafts = await draftWriteups({ ...profile, ...mapping }, writeupFields);

  const finalData = { ...mergedData, ...drafts };

  if (Object.keys(mapping).length > 0 || Object.keys(drafts).length > 0) {
    setSectionData(submission, sectionId, finalData);
    submission.lastEditedAt = new Date();
    await submission.save();
  }

  return submission;
}

function isFilled(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Generates a suggestion for one field on demand (the editor's per-field "Ask AI" button).
 * Deliberately does not save the submission — the caller drops the result into the editor as
 * ordinary editable text, same as anything the student typed themselves, so it only persists
 * once they save their progress.
 */
export async function suggestFieldValue(id: string, ownerId: string, fieldId: string): Promise<string> {
  const { submission, template } = await getSubmissionWithTemplate(id, ownerId);
  const user = await UserModel.findById(ownerId);
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');

  const sectionId = ownerSectionId(template);
  const field = template.fieldSchema.find((f) => f.id === fieldId && f.sectionId === sectionId);
  if (!field) throw new ApiError(404, 'Field not found', 'NOT_FOUND');
  if (field.type !== 'text' && field.type !== 'long_text_ruled') {
    throw new ApiError(400, 'AI suggestions are only available for text and write-up fields', 'VALIDATION_ERROR');
  }

  const profile = { fullName: user.primaryProfile.fullName, ...user.primaryProfile, email: user.primaryProfile.email ?? user.email };
  const existingData = submission.sections.get(sectionId)?.data ?? {};
  const knownFacts: Record<string, unknown> = { ...profile, ...existingData };
  delete knownFacts[fieldId];

  return suggestSingleFieldValue(knownFacts, {
    id: field.id,
    label: field.label,
    type: field.type,
    helpText: field.helpText,
    ruledLineCount: field.ruledLineCount,
  });
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
  /** Relative API path — the frontend prepends its own API base to build the actual href. */
  downloadUrl: string;
  missingFields: MissingField[];
}

/** Downloads the original PDF, overlays filled values, and re-uploads the result. */
export async function generateSubmissionPdf(id: string, ownerId: string): Promise<GenerateResult> {
  const { submission, template } = await getSubmissionWithTemplate(id, ownerId);

  const originalBytes = await downloadAsset(template.sourceCloudinaryId, 'raw');
  const filledBytes = await fillPdf(originalBytes, template, submission);
  const upload = await uploadDocument(Buffer.from(filledBytes), 'generated', `${submission._id.toString()}-filled`);

  const missingFields = findMissingRequiredFields(template, submission);
  submission.generatedPdfUrl = getSignedUrl(upload.publicId, 'raw');
  submission.generatedPdfPublicId = upload.publicId;
  submission.status = missingFields.length === 0 ? 'complete' : 'draft';
  submission.lastEditedAt = new Date();
  await submission.save();

  logger.info({ submissionId: id, missing: missingFields.length }, 'Submission PDF generated');
  return { submission, downloadUrl: `/submissions/${submission._id.toString()}/download`, missingFields };
}

/**
 * Cloudinary's raw+authenticated URLs are shaped .../v<version>/<public_id>?<query> — the
 * public_id is exactly the path segment between the version and the query string.
 */
function extractPublicIdFromCloudinaryUrl(url: string): string | undefined {
  return url.match(/\/v\d+\/([^?]+)/)?.[1];
}

/**
 * generatedPdfPublicId was added after generatedPdfUrl already existed — submissions generated
 * before that (confirmed on a real one: status "complete", a valid generatedPdfUrl, but no
 * generatedPdfPublicId) would otherwise 404 on /download and /email despite genuinely having a
 * generated PDF. Falls back to parsing the public_id back out of the legacy URL, and backfills
 * the field so later calls skip the fallback.
 */
async function resolveGeneratedPdfPublicId(submission: ISubmission): Promise<string | undefined> {
  if (submission.generatedPdfPublicId) return submission.generatedPdfPublicId;
  if (!submission.generatedPdfUrl) return undefined;

  const publicId = extractPublicIdFromCloudinaryUrl(submission.generatedPdfUrl);
  if (!publicId) return undefined;

  submission.generatedPdfPublicId = publicId;
  await submission.save();
  logger.info({ submissionId: submission._id.toString() }, 'Backfilled generatedPdfPublicId from legacy generatedPdfUrl');
  return publicId;
}

/**
 * Re-fetches the generated PDF's bytes so the API can serve them itself with an explicit
 * application/pdf content type and a friendly filename — Cloudinary's raw+authenticated delivery
 * can't reliably serve a signed URL that ends in a real .pdf extension (a dot in the public_id
 * gets parsed as a delivery format and invalidates the signature), so browsers linked straight to
 * a Cloudinary URL had no way to tell it was a PDF and force-downloaded an extensionless file.
 */
export async function downloadGeneratedPdf(id: string, ownerId: string): Promise<{ bytes: Buffer; filename: string }> {
  const { submission, template } = await getSubmissionWithTemplate(id, ownerId);
  const publicId = await resolveGeneratedPdfPublicId(submission);
  if (!publicId) throw new ApiError(404, 'This submission has no generated PDF yet', 'NOT_FOUND');

  const bytes = await downloadAsset(publicId, 'raw');
  const safeTitle = template.title.replace(/[^\w -]+/g, '').trim();
  return { bytes, filename: `${safeTitle || 'form'}.pdf` };
}

/** Emails the finished PDF to whoever the student needs to send it to (an advisor, a sponsor, ...). */
export async function emailGeneratedPdf(id: string, ownerId: string, to: string, message?: string): Promise<void> {
  const [{ submission, template }, user] = await Promise.all([getSubmissionWithTemplate(id, ownerId), UserModel.findById(ownerId)]);
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');
  const publicId = await resolveGeneratedPdfPublicId(submission);
  if (!publicId) throw new ApiError(404, 'This submission has no generated PDF yet', 'NOT_FOUND');

  const bytes = await downloadAsset(publicId, 'raw');
  const safeTitle = template.title.replace(/[^\w -]+/g, '').trim();

  await sendFormEmail({
    to,
    senderName: user.primaryProfile.fullName || user.email,
    formTitle: template.title,
    message,
    attachment: { filename: `${safeTitle || 'form'}.pdf`, content: bytes },
  });
}
