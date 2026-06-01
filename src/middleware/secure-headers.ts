import { secureHeaders } from 'hono/secure-headers';

/**
 * Security headers middleware.
 * Sets HSTS, prevents framing, sniffing, and applies restrictive CSP.
 */
export const securityHeaders = secureHeaders({
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  contentSecurityPolicy: {
    defaultSrc: ["'none'"],
  },
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
  },
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
});
