import 'dotenv/config';
import { z } from 'zod';

/**
 * Todas as variáveis de ambiente são validadas na inicialização.
 * Falhar cedo evita que a API suba com uma configuração insegura/incompleta.
 */
const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL é obrigatória')
    .refine((value) => /^postgres(ql)?:\/\//.test(value), {
      message: 'DATABASE_URL deve ser uma URL PostgreSQL'
    }),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:4173'),
  COOKIE_SECURE: booleanFromString,
  /**
   * Em produção o frontend e o backend estão em subdomínios diferentes de um
   * domínio público (onrender.com está na PSL), portanto a requisição é cross-site
   * e o cookie precisa de SameSite=None. Em desenvolvimento, Lax é suficiente.
   */
  COOKIE_SAME_SITE: z.enum(['none', 'lax', 'strict']).optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info')
});

export type Env = z.infer<typeof envSchema> & { COOKIE_SAME_SITE: 'none' | 'lax' | 'strict' };

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'ambiente'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Configuração de ambiente inválida:\n${details}\n\n` +
        'Copie backend/.env.example para backend/.env e preencha os valores.'
    );
  }

  // Em produção o cookie deve ser sempre Secure (HTTPS), mesmo que .env diga o contrário.
  const isProduction = result.data.NODE_ENV === 'production';
  const secure = isProduction ? true : result.data.COOKIE_SECURE;
  const sameSite =
    result.data.COOKIE_SAME_SITE ?? (isProduction ? 'none' : 'lax');

  // SameSite=None exige Secure; sem isso o navegador descarta o cookie.
  if (sameSite === 'none' && !secure) {
    throw new Error(
      'COOKIE_SAME_SITE=none exige COOKIE_SECURE=true (ou NODE_ENV=production).'
    );
  }

  cachedEnv = { ...result.data, COOKIE_SECURE: secure, COOKIE_SAME_SITE: sameSite };

  return cachedEnv;
}

export const env = getEnv();

export function getAllowedOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
