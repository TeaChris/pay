# Security Policy — PAY Backend

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | ✅ Yes    |
| < latest | ❌ No   |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Use [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).

### Response Timeline

| Action | Timeline |
|---|---|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 5 business days |
| Critical fix | < 24 hours |
| High fix | < 3 days |

## Security Architecture

- **Authentication:** JWT ES256 (ECDSA P-256) with cookie-based delivery
- **Password Hashing:** Argon2id with configurable cost parameters
- **MFA:** TOTP with AES-256-GCM encrypted secrets and hashed recovery codes
- **Token Rotation:** Family-based refresh token replay detection
- **Rate Limiting:** Redis sliding window (Lua script) per-endpoint
- **Session Management:** Max sessions per user, idle timeout, real-time revocation
- **RBAC:** 4 roles, 12 permissions, Redis-cached permission checks
- **Audit Logging:** All sensitive operations logged with correlation IDs
- **Log Redaction:** 18 sensitive field patterns automatically redacted
- **Headers:** HSTS, CSP (default-src: none), X-Frame-Options DENY, COOP, CORP
- **Anti-Enumeration:** Timing-safe dummy hash, vague error messages

## Scope

**In scope:** Auth bypass, injection, token vulnerabilities, RBAC bypass, data exposure, crypto weaknesses, rate limit bypass.

**Out of scope:** Frontend issues (report to frontend repo), DoS, social engineering, physical access.
