import type { Request, Response } from 'express';
import { listTemplates, getTemplateById } from '../Services/template.service.js';
import { createApiSuccess } from '../Utils/response.js';
import { asyncHandler } from '../Utils/asyncHandler.js';

export const listTemplatesHandler = asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query['search'] === 'string' ? req.query['search'] : undefined;
  const templates = await listTemplates(search);
  res.json(createApiSuccess({ templates }));
});

export const getTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const template = await getTemplateById(req.params['id'] as string);
  res.json(createApiSuccess({ template }));
});
