import { z } from 'zod';

const envSchema = z.object({
  // OpenRouter API Configuration
  OPENROUTER_API_KEY: z
    .string()
    .startsWith('sk-', 'OPENROUTER_API_KEY must start with sk-or-v1-')
    .optional(),

  OPENROUTER_MODEL: z
    .string()
    .min(1, 'OPENROUTER_MODEL is required')
    .default('x-ai/grok-4-fast:free'),

  // Fallback OpenAI API (optional)
  OPENAI_API_KEY: z
    .string()
    .startsWith('sk-', 'OPENAI_API_KEY must start with sk-')
    .optional(),

  SERPAPI_API_KEY: z.string().min(1).optional(),

  GITHUB_TOKEN: z.string().min(1).optional(),

  PRODUCTHUNT_API_TOKEN: z
    .string()
    .min(1, 'PRODUCTHUNT_API_TOKEN is required for Product Hunt API')
    .optional(),

  // Email Configuration (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_TO: z
    .string()
    .transform((val) => val.split(',').map(email => email.trim()))
    .pipe(z.array(z.string().email()))
    .optional(),

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
