import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import type { JWTPayload } from '../Types/index.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface AccessTokenClaims {
  sub: string;
  email: string;
}

export async function signAccessToken(claims: AccessTokenClaims): Promise<string> {
  return new SignJWT({ email: claims.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TOKEN_TTL)
    .sign(secret);
}

export async function signRefreshToken(sub: string): Promise<string> {
  return new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_TOKEN_TTL)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  return payload as unknown as JWTPayload;
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  if (payload['type'] !== 'refresh' || !payload.sub) {
    throw new Error('Invalid refresh token');
  }
  return { sub: payload.sub };
}
