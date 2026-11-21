import { z } from 'zod';

/** Cadastro espelha o formulário de aluno do frontend (mínimo de 6 caracteres). */
export const registerBodySchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome.').max(120),
    email: z.email('Email inválido.').max(190).transform((value) => value.toLowerCase()),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').max(72),
    confirmPassword: z.string().min(1, 'Confirme a senha.'),
    stage: z.enum(['fundamental', 'medio']).default('fundamental'),
    grade: z.string().trim().min(1, 'Informe o ano/série.').max(30),
    avatarTone: z.string().trim().max(30).optional()
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.'
  });

export const loginBodySchema = z.object({
  email: z.email('Email inválido.').max(190).transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Informe a senha.').max(72)
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
