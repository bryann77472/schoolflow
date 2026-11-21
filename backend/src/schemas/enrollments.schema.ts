import { z } from 'zod';

const positiveId = z.coerce.number().int().positive();

export const enrollmentParamsSchema = z.object({
  studentId: positiveId,
  classId: positiveId
});

export const enrollmentQuerySchema = z.object({
  studentId: positiveId.optional(),
  classId: positiveId.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const createEnrollmentBodySchema = z.object({
  studentId: positiveId,
  classId: positiveId
});

export type EnrollmentQuery = z.infer<typeof enrollmentQuerySchema>;
export type CreateEnrollmentBody = z.infer<typeof createEnrollmentBodySchema>;
