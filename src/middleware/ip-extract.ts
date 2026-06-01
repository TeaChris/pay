import type { AppEnv } from '../shared/types.js'
import { createMiddleware } from 'hono/factory'
import { getEnv } from '../config/env.js'

/**
 * Check if an IP address is a loopback address.
 */
function isLoopback(ip: string): boolean {
      const trimmed = ip.trim()
      return (
            trimmed === '::1' ||
            trimmed.startsWith('127.') ||
            trimmed.startsWith('::ffff:127.')
      )
}

/**
 * Check if an IP is a trusted proxy based on TRUSTED_PROXIES config.
 */
function isTrustedProxy(ip: string, trustedProxies: string): boolean {
      const trimmed = ip.trim()
      if (trustedProxies === 'loopback') {
            return isLoopback(trimmed)
      }
      const trusted = trustedProxies.split(',').map((p) => p.trim())
      return trusted.includes(trimmed)
}

/**
 * Extract real client IP from X-Forwarded-For header.
 * Walks the chain from right to left, skipping trusted proxies,
 * to find the first untrusted (real client) IP.
 */
export const ipExtract = createMiddleware<AppEnv>(async (c, next) => {
      const env = getEnv()
      let ip = 'unknown'

      const xff = c.req.header('x-forwarded-for')
      if (xff) {
            const ips = xff.split(',').map((addr) => addr.trim())
            // Walk from right to left — first non-trusted IP is the client
            for (let i = ips.length - 1; i >= 0; i--) {
                  const candidate = ips[i]!
                  if (!isTrustedProxy(candidate, env.TRUSTED_PROXIES)) {
                        ip = candidate
                        break
                  }
            }
            // If all IPs are trusted, use the leftmost
            if (ip === 'unknown' && ips.length > 0) {
                  ip = ips[0]!
            }
      }

      // Fallback to X-Real-Ip
      if (ip === 'unknown') {
            const xRealIp = c.req.header('x-real-ip')
            if (xRealIp) {
                  ip = xRealIp.trim()
            }
      }

      // Final fallback
      if (ip === 'unknown') {
            ip = '127.0.0.1'
      }

      c.set('clientIp', ip)
      await next()
})
