import { zValidator } from '@hono/zod-validator';
import type { z, ZodSchema } from 'zod';
import { ValidationError } from '../shared/errors.js';

/**
 * Zod request body validation middleware.
 * Returns a generic 400 error — never leaks Zod details to client.
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return zValidator('json', schema, (result) => {
    if (!result.success) {
      throw new ValidationError('Invalid request body');
    }
  });
}

/**
 * Zod route params validation middleware.
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return zValidator('param', schema, (result) => {
    if (!result.success) {
      throw new ValidationError('Invalid request parameters');
    }
  });
}

/**
 * Zod query string validation middleware.
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return zValidator('query', schema, (result) => {
    if (!result.success) {
      throw new ValidationError('Invalid query parameters');
    }
  });
}

/** Helper to extract validated data type from a Zod schema. */
export type ValidatedBody<T extends ZodSchema> = z.infer<T>;
