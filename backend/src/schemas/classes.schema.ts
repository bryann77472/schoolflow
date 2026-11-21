import { z } from 'zod';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const classIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const classQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  stage: z.enum(['fundamental', 'medio']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

const classFields = {
  name: z.string().trim().min(2, 'Informe o nome da turma.').max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  stage: z.enum(['fundamental', 'medio']),
  dayOfWeek: z.coerce.number().int().min(1, 'Dia inválido.').max(5, 'Dia inválido.'),
  timeStart: z.string().regex(TIME_PATTERN, 'Horário inválido (HH:mm).'),
  timeEnd: z.string().regex(TIME_PATTERN, 'Horário inválido (HH:mm).'),
  room: z.string().trim().min(1, 'Informe a sala.').max(60),
  color: z.string().regex(COLOR_PATTERN, 'Cor inválida (use #RRGGBB).'),
  teacherId: z.coerce.number().int().positive()
};

/** Schema completo: também usado após mesclar um PATCH com o estado atual. */
export const classBodySchema = z
  .object(classFields)
  .refine((data) => data.timeEnd > data.timeStart, {
    path: ['timeEnd'],
    message: 'O término deve ser depois do início.'
  });

export const updateClassBodySchema = z.object({
  name: classFields.name.optional(),
  description: classFields.description.optional(),
  stage: classFields.stage.optional(),
  dayOfWeek: classFields.dayOfWeek.optional(),
  timeStart: classFields.timeStart.optional(),
  timeEnd: classFields.timeEnd.optional(),
  room: classFields.room.optional(),
  color: classFields.color.optional(),
  teacherId: classFields.teacherId.optional()
});

export type CreateClassBody = z.infer<typeof classBodySchema>;
export type UpdateClassBody = z.infer<typeof updateClassBodySchema>;
export type ClassQuery = z.infer<typeof classQuerySchema>;
