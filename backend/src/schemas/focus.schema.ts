import { z } from 'zod';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isISODate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dateField = z.string().refine(isISODate, 'Data inválida (YYYY-MM-DD).');

export const focusQuerySchema = z.object({
  from: dateField.optional(),
  to: dateField.optional()
});

export const createFocusBodySchema = z.object({
  date: dateField.optional(),
  minutes: z.coerce.number().int().min(1, 'Mínimo de 1 minuto.').max(720, 'Máximo de 12 horas.'),
  sessions: z.coerce.number().int().min(1).max(100).default(1)
});

export type FocusQuery = z.infer<typeof focusQuerySchema>;
export type CreateFocusBody = z.infer<typeof createFocusBodySchema>;
