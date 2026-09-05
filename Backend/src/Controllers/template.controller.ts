import type { Request, Response } from 'express';
import {
  listTemplates,
  getTemplateById,
  getTemplatePagePreview,
  updateFieldCoordinates,
  updateGridCellOverride,
} from '../Services/template.service.js';
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

export const getTemplatePagePreviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const pageNumber = Number(req.params['pageNumber']);
  const png = await getTemplatePagePreview(req.params['id'] as string, pageNumber);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  // helmet's default Cross-Origin-Resource-Policy (same-origin) blocks the frontend's <img>
  // from loading this cross-origin during local dev (different port); this response is meant
  // to be embedded from the frontend origin, so relax it just for this route.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.send(png);
});

export const updateFieldCoordinatesHandler = asyncHandler(async (req: Request, res: Response) => {
  const template = await updateFieldCoordinates(
    req.params['id'] as string,
    req.params['fieldId'] as string,
    req.user!.sub,
    req.body.coordinates,
  );
  res.json(createApiSuccess({ template }));
});

export const updateGridCellOverrideHandler = asyncHandler(async (req: Request, res: Response) => {
  const template = await updateGridCellOverride(
    req.params['id'] as string,
    req.params['fieldId'] as string,
    req.user!.sub,
    req.body.criterion,
    req.body.option,
    { x: req.body.x, y: req.body.y },
  );
  res.json(createApiSuccess({ template }));
});
