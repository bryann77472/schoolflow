import { z } from 'zod';

export const markNotificationsReadSchema = z.object({
  keys: z.array(z.string().trim().min(1).max(190)).min(1).max(200)
});

export type MarkNotificationsReadBody = z.infer<typeof markNotificationsReadSchema>;
