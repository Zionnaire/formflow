import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';
import { createApiError } from '../Utils/response.js';
import { isApiError } from '../Utils/errors.js';
import { API_ERROR_CODES } from '../Types/index.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;

  if (isApiError(err)) {
    if (err.statusCode >= 500) logger.error({ err, url: req.url }, 'API error');
    res.status(err.statusCode).json(createApiError(err.code, err.message));
    return;
  }

  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  res.status(500).json(createApiError(API_ERROR_CODES.INTERNAL_ERROR, message));
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(createApiError(API_ERROR_CODES.NOT_FOUND, `Route ${req.method} ${req.path} not found`));
}
