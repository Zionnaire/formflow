import { z } from 'zod';

/** zod's .default() only kicks in when a key is *missing* — an explicit `KEY=` in .env is an empty string, not absent. */
function emptyToUndefined(schema: z.ZodTypeAny) {
  return z.preprocess((v) => (v === '' ? undefined : v), schema);
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_ACCESS_TOKEN_TTL: z.string().default('15m'),
  JWT_REFRESH_TOKEN_TTL: z.string().default('30d'),

  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),

  // openai/gpt-oss-120b: confirmed active on Groq's live /v1/models endpoint, supports tool
  // calling + JSON mode (needed for structured field-schema/auto-fill output). Verify against
  // https://console.groq.com/docs/models before changing — Groq deprecates models frequently.
  GROQ_API_KEY: z.string().default(''),
  GROQ_MODEL: emptyToUndefined(z.string().default('openai/gpt-oss-120b')),

  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((v) => v.split(',').map((o) => o.trim())),

  SHARE_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(14),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Emailing the finished PDF (brief section 9-ish: hand the completed form to whoever needs it)
  // — absent in dev by default; the feature 503s cleanly rather than failing confusingly.
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: emptyToUndefined(z.string().default('FormFlow <no-reply@formflow.app>')),
});

function parseEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  return result.data;
}

export const env = parseEnv();
export type Env = typeof env;
