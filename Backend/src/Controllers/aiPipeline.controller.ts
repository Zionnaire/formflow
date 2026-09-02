/**
 * AI-assisted PDF pipeline — field extraction, profile auto-fill mapping, validation,
 * and final PDF generation (brief section 8). These require an Anthropic API key and a
 * pdf-lib fill pass and are intentionally left unimplemented until that integration work
 * is scheduled (brief section 10, step 1 and step 5-6).
 *
 * Each stays a narrow, single-purpose endpoint per the brief's guidance so template
 * caching can skip extraction entirely once a fileHash is already known.
 */
import type { Request, Response } from 'express';
import { createApiError } from '../Utils/response.js';
import { API_ERROR_CODES } from '../Types/index.js';

function notImplemented(_req: Request, res: Response): void {
  res
    .status(501)
    .json(createApiError(API_ERROR_CODES.NOT_IMPLEMENTED, 'This AI pipeline step is not wired up yet'));
}

export const extractFieldsHandler = notImplemented;
export const autoFillHandler = notImplemented;
export const validateSubmissionHandler = notImplemented;
export const generatePdfHandler = notImplemented;
