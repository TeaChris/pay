import { z } from 'zod';

export const revokeSessionParamsSchema = z.object({
  id: z.string().uuid(),
});
