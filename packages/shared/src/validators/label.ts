import { z } from 'zod';

export const createLabelSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1, 'Label name is required').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color format'),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
