import { SignJWT, jwtVerify } from 'jose'
import { randomUUID } from 'node:crypto'
import { getEnv } from '../../config/env.js'
import { getRedis } from '../../infrastructure/redis/client.js'
import { RedisKeys } from '../../infrastructure/redis/keys.js'
import { MFA_CHALLENGE_TTL_SEC } from '../../config/constants.js'
import { getPrivateKey, getPublicKey } from '../../config/keys.js'
import { AuthenticationError, TokenExpiredError } from '../../shared/errors.js'
import type {
      AccessTokenPayload,
      MfaChallengePayload,
} from '../../shared/types.js'

/**
 * Sign a short-lived ES256 access token JWT.
 */
export async function signAccessToken(params: {
      userId: string
      sessionId: string
      role: string
      mfaVerified?: boolean
}): Promise<string> {
      const env = getEnv()
      const privateKey = getPrivateKey()

      const builder = new SignJWT({
            sub: params.userId,
            sid: params.sessionId,
            role: params.role,
            mfa: params.mfaVerified === true,
      })
            .setProtectedHeader({ alg: 'ES256' })
            .setJti(randomUUID())
            .setIssuedAt()
            .setIssuer(env.JWT_ISSUER)
            .setAudience(`${env.JWT_ISSUER}:access`)
            .setExpirationTime(`${env.JWT_ACCESS_TOKEN_TTL}s`)

      return builder.sign(privateKey)
}

/**
 * Verify an access token and extract its payload.
 */
export async function verifyAccessToken(
      token: string,
): Promise<AccessTokenPayload & { mfa?: boolean }> {
      const env = getEnv()
      const publicKey = getPublicKey()

      try {
            const { payload } = await jwtVerify(token, publicKey, {
                  issuer: env.JWT_ISSUER,
                  audience: `${env.JWT_ISSUER}:access`,
                  algorithms: ['ES256'],
                  clockTolerance: 5,
            })

            return payload as unknown as AccessTokenPayload & { mfa?: boolean }
      } catch (err) {
            if ((err as Error)?.name === 'JWTExpired') {
                  throw new TokenExpiredError()
            }
            throw new AuthenticationError()
      }
}

/**
 * Sign a short-lived MFA challenge token.
 * This token proves the user passed password auth but still needs MFA.
 */
export async function signMfaChallengeToken(userId: string): Promise<string> {
      const env = getEnv()
      const privateKey = getPrivateKey()
      const jti = randomUUID()

      const token = await new SignJWT({
            sub: userId,
            purpose: 'mfa_challenge',
      })
            .setProtectedHeader({ alg: 'ES256' })
            .setJti(jti)
            .setIssuedAt()
            .setIssuer(env.JWT_ISSUER)
            .setAudience(`${env.JWT_ISSUER}:mfa`)
            .setExpirationTime(`${MFA_CHALLENGE_TTL_SEC}s`)
            .sign(privateKey)

      // Store challenge in Redis with max attempt count (single-use enforcement)
      const redis = getRedis()
      await redis.set(
            RedisKeys.mfaChallengeAttempts(jti),
            '5',
            'EX',
            MFA_CHALLENGE_TTL_SEC,
      )

      return token
}

/**
 * Verify an MFA challenge token.
 */
export async function verifyMfaChallengeToken(
      token: string,
): Promise<MfaChallengePayload> {
      const env = getEnv()
      const publicKey = getPublicKey()

      try {
            const { payload } = await jwtVerify(token, publicKey, {
                  issuer: env.JWT_ISSUER,
                  audience: `${env.JWT_ISSUER}:mfa`,
                  algorithms: ['ES256'],
                  clockTolerance: 5,
            })

            if (payload['purpose'] !== 'mfa_challenge') {
                  throw new AuthenticationError()
            }

            return payload as unknown as MfaChallengePayload
      } catch (err) {
            if (err instanceof AuthenticationError) throw err
            if ((err as Error)?.name === 'JWTExpired') {
                  throw new TokenExpiredError()
            }
            throw new AuthenticationError()
      }
}
