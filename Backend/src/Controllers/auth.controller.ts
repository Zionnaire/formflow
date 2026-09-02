import type { Request, Response } from 'express';
import { registerUser, loginUser, refreshAuthTokens, getUserById, updateProfile } from '../Services/auth.service.js';
import { createApiSuccess, createApiError } from '../Utils/response.js';
import { asyncHandler } from '../Utils/asyncHandler.js';
import { API_ERROR_CODES } from '../Types/index.js';
import { env } from '../config/env.js';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, user } = await registerUser(req.body.email, req.body.password, req.body.fullName);
  res
    .cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_TTL_MS })
    .cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: REFRESH_TTL_MS, path: '/api/v1/auth/token/refresh' })
    .status(201)
    .json(createApiSuccess({ user }));
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, user } = await loginUser(req.body.email, req.body.password);
  res
    .cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_TTL_MS })
    .cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: REFRESH_TTL_MS, path: '/api/v1/auth/token/refresh' })
    .json(createApiSuccess({ user }));
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const token: string | undefined = req.cookies?.['refresh_token'];
  if (!token) {
    res.status(401).json(createApiError(API_ERROR_CODES.TOKEN_INVALID, 'No refresh token'));
    return;
  }
  const { accessToken, refreshToken } = await refreshAuthTokens(token);
  res
    .cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_TTL_MS })
    .cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: REFRESH_TTL_MS, path: '/api/v1/auth/token/refresh' })
    .json(createApiSuccess({ refreshed: true }));
});

export function logoutHandler(_req: Request, res: Response): void {
  res
    .clearCookie('access_token', COOKIE_OPTS)
    .clearCookie('refresh_token', { ...COOKIE_OPTS, path: '/api/v1/auth/token/refresh' })
    .json(createApiSuccess({ loggedOut: true }));
}

export const getMeHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserById(req.user!.sub);
  if (!user) {
    res.status(404).json(createApiError(API_ERROR_CODES.NOT_FOUND, 'User not found'));
    return;
  }
  res.json(createApiSuccess({ user }));
});

export const updateProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await updateProfile(req.user!.sub, req.body);
  res.json(createApiSuccess({ user }));
});
