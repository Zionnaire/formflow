import mongoose from 'mongoose';
import { SubmissionModel, type ISubmission } from '../Models/Submission.model.js';
import { FormTemplateModel } from '../Models/FormTemplate.model.js';
import { ApiError } from '../Utils/errors.js';
import { logger } from '../Middlewares/logger.js';

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

/** Partial, resumable save — used for both manual edits and "save & continue later". */
export async function patchSubmissionSection(
  id: string,
  ownerId: string,
  sectionId: string,
  data: Record<string, unknown>,
): Promise<ISubmission> {
  const submission = await getSubmissionForOwner(id, ownerId);
  submission.sections.set(sectionId, {
    ...(submission.sections.get(sectionId) ?? {}),
    data,
  } as never);
  submission.lastEditedAt = new Date();
  await submission.save();
  return submission;
}
