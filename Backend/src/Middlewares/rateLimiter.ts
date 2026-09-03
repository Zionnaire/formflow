import rateLimit from 'express-rate-limit';

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Tighter limit for auth and shared-fill token endpoints — these are pre-auth and public. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Each of these calls Groq (extract-fields, auto-fill) or does real work re-uploading a PDF
 * (generate) — worth a tighter per-user budget than the general API limit, independent of
 * Groq's own per-account throughput cap (see Services/groq.service.ts).
 */
export const aiPipelineRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
