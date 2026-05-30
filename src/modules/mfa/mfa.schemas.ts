import { z } from 'zod';

export const mfaVerifySchema = z.object({
  code: z.string().min(1).max(20),
  mfaChallengeToken: z.string().optional(),
});

export const mfaDisableSchema = z.object({
  password: z.string().min(1),
  code: z.string().min(1).max(20),
});
