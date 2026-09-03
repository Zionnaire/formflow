import type { Request, Response } from 'express';
import { createShare, buildShareUrl, getPublicShareView, submitShareSection } from '../Services/share.service.js';
import { createApiSuccess } from '../Utils/response.js';
import { asyncHandler } from '../Utils/asyncHandler.js';

export const createShareHandler = asyncHandler(async (req: Request, res: Response) => {
  const share = await createShare(req.params['id'] as string, req.user!.sub, req.body.sectionId, req.body.role);
  res.status(201).json(createApiSuccess({ share, url: buildShareUrl(share.token) }));
});

export const resolveShareHandler = asyncHandler(async (req: Request, res: Response) => {
  const share = await getPublicShareView(req.params['token'] as string);
  res.json(createApiSuccess({ share }));
});

export const submitShareHandler = asyncHandler(async (req: Request, res: Response) => {
  await submitShareSection(req.params['token'] as string, req.body.data);
  res.json(createApiSuccess({ submitted: true }));
});
