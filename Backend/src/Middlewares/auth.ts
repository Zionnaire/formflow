import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './jwt.js';
import { createApiError } from '../Utils/response.js';
import { API_ERROR_CODES } from '../Types/index.js';
import type { JWTPayload } from '../Types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token: string | undefined = req.cookies?.['access_token'];
  if (!token) {
    res.status(401).json(createApiError(API_ERROR_CODES.TOKEN_INVALID, 'Authentication required'));
    return;
  }

  try {
    req.user = await verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json(createApiError(API_ERROR_CODES.TOKEN_EXPIRED, 'Token expired or invalid'));
  }
}
