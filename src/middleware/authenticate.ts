import { jwtVerify } from 'jose'
import { getCookie } from 'hono/cookie'
import { getEnv } from '../config/env.js'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../shared/types.js'
import { getPublicKey } from '../config/keys.js'
import { ACCESS_COOKIE_NAME } from '../config/constants.js'
import { AuthenticationError, TokenExpiredError } from '../shared/errors.js'

/**
 * JWT authentication middleware.
 * Reads access token from __Host-at cookie, verifies ES256 signature,
 * and sets userId, sessionId, userRole on context.
 */
export const authenticate = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, ACCESS_COOKIE_NAME)

  if (!token) {
    throw new AuthenticationError()
  }

  try {
    const env = getEnv()
    const publicKey = getPublicKey()

    const { payload } = await jwtVerify(token, publicKey, {
      issuer: env.JWT_ISSUER,
      audience: `${env.JWT_ISSUER}:access`,
      algorithms: ['ES256'],
      clockTolerance: 5, // 5 second tolerance for clock skew
    })

    const sub = payload['sub']
    const sid = payload['sid']
    const role = payload['role']

    if (
      typeof sub !== 'string' ||
      typeof sid !== 'string' ||
      typeof role !== 'string'
    ) {
      throw new AuthenticationError()
    }

    c.set('userId', sub)
    c.set('sessionId', sid)
    c.set('userRole', role)

    await next()
  } catch (err) {
    if (err instanceof AuthenticationError) throw err

    // jose throws JWTExpired for expired tokens
    const errorName = (err as Error)?.name
    if (errorName === 'JWTExpired') {
      throw new TokenExpiredError()
    }

    throw new AuthenticationError()
  }
})
