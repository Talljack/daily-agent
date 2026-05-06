import { z } from 'zod';

const optionalNonEmptyString = () =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().optional());

const envSchema = z.object({
  // OpenRouter API Configuration
  OPENROUTER_API_KEY: optionalNonEmptyString()
    .refine((value) => value === undefined || value.startsWith('sk-'), {
      message: 'OPENROUTER_API_KEY must start with sk-or-v1-',
    }),

  OPENROUTER_MODEL: z
    .string()
    .min(1, 'OPENROUTER_MODEL is required')
    .default('x-ai/grok-4-fast:free'),

  // Fallback OpenAI API (optional)
  OPENAI_API_KEY: optionalNonEmptyString()
    .refine((value) => value === undefined || value.startsWith('sk-'), {
      message: 'OPENAI_API_KEY must start with sk-',
    }),

  SERPAPI_API_KEY: optionalNonEmptyString(),

  GITHUB_TOKEN: optionalNonEmptyString(),

  PRODUCTHUNT_API_TOKEN: optionalNonEmptyString(),

  // Email Configuration (optional)
  SMTP_HOST: optionalNonEmptyString(),
  SMTP_PORT: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .optional()),
  SMTP_USER: optionalNonEmptyString().pipe(z.string().email().optional()),
  SMTP_PASS: optionalNonEmptyString(),
  EMAIL_FROM: optionalNonEmptyString().pipe(z.string().email().optional()),
  EMAIL_TO: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z
    .string()
    .transform((val) => val.split(',').map(email => email.trim()))
    .pipe(z.array(z.string().email()))
    .optional()),

  DAILY_CRON_SCHEDULE: z
    .string()
    .min(1, 'DAILY_CRON_SCHEDULE is required')
    .default('0 8 * * *'),

  DAILY_TIMEZONE: z
    .string()
    .min(1, 'DAILY_TIMEZONE is required')
    .default('Asia/Shanghai'),

  // Application Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default('3000'),
});

// Validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();

// Export individual env vars for convenience
export const {
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL,
  OPENAI_API_KEY,
  SERPAPI_API_KEY,
  GITHUB_TOKEN,
  PRODUCTHUNT_API_TOKEN,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  EMAIL_TO,
  DAILY_CRON_SCHEDULE,
  DAILY_TIMEZONE,
  NODE_ENV,
  PORT,
} = env;

// Helper functions
export const isProduction = NODE_ENV === 'production';
export const isDevelopment = NODE_ENV === 'development';

export const hasEmailConfig = () => {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && EMAIL_FROM && EMAIL_TO);
};

export const hasAIConfig = () => Boolean(OPENROUTER_API_KEY || OPENAI_API_KEY);

// Export types
export type Env = z.infer<typeof envSchema>;
