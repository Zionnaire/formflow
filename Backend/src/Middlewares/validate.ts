import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { createApiError } from '../Utils/response.js';
import { API_ERROR_CODES } from '../Types/index.js';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      res
        .status(400)
        .json(createApiError(API_ERROR_CODES.VALIDATION_ERROR, 'Validation failed', flattenZodErrors(result.error)));
      return;
    }
    req[target] = result.data as never;
    next();
  };
}

function flattenZodErrors(error: ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.join('.') || '_root';
    (acc[key] ??= []).push(issue.message);
    return acc;
  }, {});
}
