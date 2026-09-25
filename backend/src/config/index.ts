import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const configSchema = z.object({
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  CLIENT_URL: z.string().optional(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL environment variable is required'),
  BETTER_AUTH_SECRET: z.string().min(16, 'BETTER_AUTH_SECRET must be at least 16 characters'),
  BETTER_AUTH_URL: z.string().default('http://localhost:5000'),
  GOOGLE_CLIENT_ID: z.string().optional(),
GOOGLE_CLIENT_SECRET: z.string().optional(),
GOOGLE_REDIRECT_URI: z.string().url().default('https://auditorium-backend.vercel.app/api/google-drive/callback'),
GOOGLE_REFRESH_TOKEN: z.string().optional(),
});

const parsedConfig = configSchema.safeParse({
  ...process.env,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173',
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
});

if (!parsedConfig.success) {
  console.error('Invalid environment configuration:', parsedConfig.error.format());
  process.exit(1);
}

export const config = parsedConfig.data;
export type Config = z.infer<typeof configSchema>;

