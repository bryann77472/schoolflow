import { z } from 'zod';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isISODate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dateField = z.string().refine(isISODate, 'Data inválida (YYYY-MM-DD).');

export const eventIdParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const eventQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.enum(['meeting', 'academic', 'culture', 'sports', 'holiday', 'other']).optional(),
  classId: z.coerce.number().int().positive().nullable().optional(),
  from: dateField.optional(),
  to: dateField.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

const eventFields = {
  title: z.string().trim().min(2, 'Informe o título.').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  date: dateField,
  timeStart: z.string().regex(TIME_PATTERN, 'Horário inválido (HH:mm).'),
  timeEnd: z.string().regex(TIME_PATTERN, 'Horário inválido (HH:mm).'),
  location: z.string().trim().min(1, 'Informe o local.').max(120),
  category: z
    .enum(['meeting', 'academic', 'culture', 'sports', 'holiday', 'other'])
    .default('academic'),
  classId: z.coerce.number().int().positive().nullable().optional()
};

export const createEventBodySchema = z
  .object(eventFields)
  .refine((data) => data.timeEnd > data.timeStart, {
    path: ['timeEnd'],
    message: 'O término deve ser depois do início.'
  });

export const updateEventBodySchema = z.object({
  title: eventFields.title.optional(),
  description: eventFields.description.optional(),
  date: eventFields.date.optional(),
  timeStart: eventFields.timeStart.optional(),
  timeEnd: eventFields.timeEnd.optional(),
  location: eventFields.location.optional(),
  category: z
    .enum(['meeting', 'academic', 'culture', 'sports', 'holiday', 'other'])
    .optional(),
  classId: eventFields.classId.optional()
});

/** Valida o objeto mesclado com o estado atual (usado em PATCH). */
export const resolvedEventSchema = createEventBodySchema;

export type CreateEventBody = z.infer<typeof createEventBodySchema>;
export type UpdateEventBody = z.infer<typeof updateEventBodySchema>;
export type EventQuery = z.infer<typeof eventQuerySchema>;
