import { z } from 'zod';

export const GRADES = {
  fundamental: ['6º ano', '7º ano', '8º ano', '9º ano'],
  medio: ['1º ano', '2º ano', '3º ano']
} as const;

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const userQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

function checkRoleFields(
  data: { role: string; stage?: string | null; grade?: string | null },
  ctx: z.RefinementCtx
): void {
  if (data.role === 'aluno') {
    if (!data.stage || !(data.stage in GRADES)) {
      ctx.addIssue({ code: 'custom', path: ['stage'], message: 'Etapa inválida para aluno.' });
      return;
    }
    if (!data.grade || !GRADES[data.stage as keyof typeof GRADES].includes(data.grade as never)) {
      ctx.addIssue({ code: 'custom', path: ['grade'], message: 'Ano/série inválido para a etapa.' });
    }
  }
}

export const createUserBodySchema = z
  .object({
    name: z.string().trim().min(2, 'Informe o nome.').max(120),
    email: z.email('Email inválido.').max(190).transform((value) => value.toLowerCase()),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').max(72),
    role: z.enum(['aluno', 'professor', 'admin']),
    stage: z.enum(['fundamental', 'medio']).optional(),
    grade: z.string().trim().max(30).optional(),
    subject: z.string().trim().max(120).optional(),
    avatarTone: z.string().trim().max(30).optional()
  })
  .superRefine(checkRoleFields);

export const updateUserBodySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.email('Email inválido.').max(190).transform((value) => value.toLowerCase()).optional(),
  password: z.string().min(6).max(72).optional(),
  role: z.enum(['aluno', 'professor', 'admin']).optional(),
  stage: z.enum(['fundamental', 'medio']).nullable().optional(),
  grade: z.string().trim().max(30).nullable().optional(),
  subject: z.string().trim().max(120).nullable().optional(),
  avatarTone: z.string().trim().max(30).optional()
});

/** Valida o objeto já mesclado com o estado atual (usado em PATCH). */
export const resolvedUserSchema = z
  .object({
    role: z.enum(['aluno', 'professor', 'admin']),
    stage: z.enum(['fundamental', 'medio']).nullable().optional(),
    grade: z.string().nullable().optional()
  })
  .superRefine(checkRoleFields);

export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
