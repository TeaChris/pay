import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';
import type { AppEnv } from '../shared/types.js';
import { ForbiddenError, AuthenticationError } from '../shared/errors.js';
import { getPublicKey } from '../config/keys.js';
import { getEnv } from '../config/env.js';
import { ACCESS_COOKIE_NAME } from '../config/constants.js';

/**
 * Middleware that ensures the user has completed MFA for the current session.
 * Must be applied AFTER the authenticate middleware.
 *
 * Checks the `mfa` claim in the access token. If the user has MFA enabled
 * but the token was issued without MFA verification, access is denied.
 */
export const requireMfa = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, ACCESS_COOKIE_NAME);
  if (!token) throw new AuthenticationError();

  try {
    const env = getEnv();
    const publicKey = getPublicKey();

    const { payload } = await jwtVerify(token, publicKey, {
      issuer: env.JWT_ISSUER,
      audience: `${env.JWT_ISSUER}:access`,
      algorithms: ['ES256'],
    });

    // If the token has mfa: true, the user completed MFA
    if (payload['mfa'] === true) {
      await next();
      return;
    }

    // If mfa is not true, deny access on sensitive routes
    throw new ForbiddenError('MFA verification required');
  } catch (err) {
    if (err instanceof ForbiddenError) throw err;
    if (err instanceof AuthenticationError) throw err;
    throw new AuthenticationError();
  }
});
