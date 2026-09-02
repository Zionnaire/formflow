import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import { uploadDocument } from '../Services/cloudinary.service.js';
import { findTemplateByHash } from '../Services/template.service.js';
import { createApiSuccess, createApiError } from '../Utils/response.js';
import { asyncHandler } from '../Utils/asyncHandler.js';
import { API_ERROR_CODES } from '../Types/index.js';

/**
 * Accepts a raw PDF, hashes it for template-cache dedup, and uploads to Cloudinary
 * on a cache miss. Field extraction (Claude) is a separate follow-up step —
 * see aiPipeline.controller.ts.
 */
export const uploadFormHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json(createApiError(API_ERROR_CODES.VALIDATION_ERROR, 'No file provided'));
    return;
  }

  const fileHash = createHash('sha256').update(req.file.buffer).digest('hex');
  const existing = await findTemplateByHash(fileHash);
  if (existing) {
    res.json(createApiSuccess({ template: existing, cached: true }));
    return;
  }

  const result = await uploadDocument(req.file.buffer, 'templates', fileHash);
  res.json(createApiSuccess({ fileHash, cloudinaryId: result.publicId, url: result.url, cached: false }));
});
