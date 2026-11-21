import { z } from 'zod';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isISODate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dateField = z.string().refine(isISODate, 'Data inválida (YYYY-MM-DD).');

export const assignmentIdParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const assignmentQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(['todo', 'doing', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  classId: z.coerce.number().int().positive().optional(),
  from: dateField.optional(),
  to: dateField.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

const assignmentFields = {
  title: z.string().trim().min(2, 'Informe o título.').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  dueDate: dateField,
  classId: z.coerce.number().int().positive(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['todo', 'doing', 'review', 'done']).default('todo'),
  teacherId: z.coerce.number().int().positive().optional()
};

export const createAssignmentBodySchema = z.object(assignmentFields);

export const updateAssignmentBodySchema = z.object({
  title: assignmentFields.title.optional(),
  description: assignmentFields.description.optional(),
  dueDate: assignmentFields.dueDate.optional(),
  classId: assignmentFields.classId.optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'doing', 'review', 'done']).optional(),
  teacherId: assignmentFields.teacherId.optional()
});

/** Valida o objeto mesclado com o estado atual (usado em PATCH). */
export const resolvedAssignmentSchema = createAssignmentBodySchema;

export type CreateAssignmentBody = z.infer<typeof createAssignmentBodySchema>;
export type UpdateAssignmentBody = z.infer<typeof updateAssignmentBodySchema>;
export type AssignmentQuery = z.infer<typeof assignmentQuerySchema>;
