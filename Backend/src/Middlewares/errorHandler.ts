import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { logger } from './logger.js';
import { createApiError } from '../Utils/response.js';
import { isApiError } from '../Utils/errors.js';
import { env } from '../config/env.js';
import { API_ERROR_CODES } from '../Types/index.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;

  if (isApiError(err)) {
    if (err.statusCode >= 500) logger.error({ err, url: req.url }, 'API error');
    res.status(err.statusCode).json(createApiError(err.code, err.message));
    return;
  }

  // A malformed :id in a URL (not valid ObjectId shape) reaches here as a Mongoose CastError,
  // not application logic — treat it the same as "not found" rather than a server fault.
  if (err instanceof mongoose.Error.CastError) {
    res.status(404).json(createApiError(API_ERROR_CODES.NOT_FOUND, 'Not found'));
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json(createApiError(API_ERROR_CODES.VALIDATION_ERROR, err.message));
    return;
  }

  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');
  // Never echo a raw unexpected-error message to the client in production — it wasn't written
  // to be user-facing and may contain internal detail. The full error is already logged above.
  const message = env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err instanceof Error ? err.message : 'An unexpected error occurred';
  res.status(500).json(createApiError(API_ERROR_CODES.INTERNAL_ERROR, message));
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(createApiError(API_ERROR_CODES.NOT_FOUND, `Route ${req.method} ${req.path} not found`));
}
