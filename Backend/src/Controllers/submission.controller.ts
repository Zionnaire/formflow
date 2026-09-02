import type { Request, Response } from 'express';
import {
  createSubmission,
  listSubmissionsForOwner,
  getSubmissionForOwner,
  patchSubmissionSection,
} from '../Services/submission.service.js';
import { createApiSuccess } from '../Utils/response.js';
import { asyncHandler } from '../Utils/asyncHandler.js';

export const createSubmissionHandler = asyncHandler(async (req: Request, res: Response) => {
  const submission = await createSubmission(req.body.formTemplateId, req.user!.sub);
  res.status(201).json(createApiSuccess({ submission }));
});

export const listSubmissionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const submissions = await listSubmissionsForOwner(req.user!.sub);
  res.json(createApiSuccess({ submissions }));
});

export const getSubmissionHandler = asyncHandler(async (req: Request, res: Response) => {
  const submission = await getSubmissionForOwner(req.params['id'] as string, req.user!.sub);
  res.json(createApiSuccess({ submission }));
});

export const patchSectionHandler = asyncHandler(async (req: Request, res: Response) => {
  const submission = await patchSubmissionSection(
    req.params['id'] as string,
    req.user!.sub,
    req.params['sectionId'] as string,
    req.body.data,
  );
  res.json(createApiSuccess({ submission }));
});
