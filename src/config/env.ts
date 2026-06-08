import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

if (process.env.JWT_SECRET) {
  process.env.JWT_ACCESS_SECRET ||= process.env.JWT_SECRET;
  process.env.JWT_REFRESH_SECRET ||= process.env.JWT_SECRET;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('5000'),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1000))
    .default('900000'),
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().int().min(1)).default('100'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional().default(''),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('https://your-frontend.vercel.app'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  DEFAULT_TENANT_ID: z.string().uuid().optional().default('00000000-0000-0000-0000-000000000001'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    console.error('❌ Environment validation failed:', messages);
    // Throw instead of process.exit so serverless functions return 500 gracefully
    throw new Error(`Missing required environment variables: ${messages}`);
  }
  throw error;
}

export { env };
