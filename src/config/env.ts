import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_NAME: z.string().min(1).default('pay-auth'),
  APP_URL: z.string().url(),
  TRUSTED_PROXIES: z.string().default('loopback'),

  // PostgreSQL
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1),

  // JWT
  JWT_PRIVATE_KEY_PATH: z.string().min(1),
  JWT_PUBLIC_KEY_PATH: z.string().min(1),
  JWT_ISSUER: z.string().min(1).default('pay-auth'),
  JWT_ACCESS_TOKEN_TTL: z.coerce.number().int().min(60).max(3600).default(900),
  JWT_REFRESH_TOKEN_TTL: z.coerce.number().int().min(3600).max(2592000).default(604800),

  // Cookies
  COOKIE_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  // Argon2
  ARGON2_MEMORY_COST: z.coerce.number().int().min(4096).default(65536),
  ARGON2_TIME_COST: z.coerce.number().int().min(1).default(3),
  ARGON2_PARALLELISM: z.coerce.number().int().min(1).default(4),

  // CORS
  CORS_ORIGINS: z.string().min(1),

  // MFA
  MFA_ISSUER: z.string().min(1).default('PayApp'),
  MFA_ENCRYPTION_KEY: z.string()
    .length(64, 'MFA_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
    .regex(/^[0-9a-fA-F]+$/, 'MFA_ENCRYPTION_KEY must be valid hexadecimal')
    .refine((key) => !/^0+$/.test(key), 'MFA_ENCRYPTION_KEY must not be all zeroes — generate with: openssl rand -hex 32'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM_ADDRESS: z.string().min(1),
  EMAIL_REPLY_TO: z.string().optional(),
}).refine(
  (data) => data.NODE_ENV !== 'production' || data.COOKIE_SECURE === true,
  { message: 'COOKIE_SECURE must be true in production', path: ['COOKIE_SECURE'] },
);

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

export function loadEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`\n❌ Environment validation failed:\n${formatted}\n`);
    process.exit(1);
  }

  _env = result.data;
  return _env;
}

export function getEnv(): Env {
  if (!_env) {
    throw new Error('Environment not loaded. Call loadEnv() first.');
  }
  return _env;
}
