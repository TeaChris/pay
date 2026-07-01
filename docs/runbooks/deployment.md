# Deployment Runbook — PAY Backend

## Architecture Overview

```
┌──────────────┐     ┌───────────────┐     ┌──────────────────┐
│  Developer    │────▶│  GitHub PR    │────▶│  CI Pipeline     │
│  (feature     │     │  (review +   │     │  (lint, type,    │
│   branch)     │     │   approval)  │     │   test, build,   │
└──────────────┘     └──────────────┘     │   migration,     │
                                           │   security)      │
                                           └────────┬─────────┘
                                                    │ merge
                                                    ▼
                                           ┌──────────────────┐
                                           │  Deploy Pipeline │
                                           │  (validate →     │
                                           │   build image →  │
                                           │   deploy →       │
                                           │   health check)  │
                                           └────────┬─────────┘
                                                    │
                          ┌─────────────────────────┼──────────────────┐
                          ▼                         ▼                  ▼
                   ┌──────────┐              ┌──────────┐      ┌──────────┐
                   │ Node.js  │              │PostgreSQL│      │  Redis   │
                   │ (Hono)   │◄────────────▶│   16     │      │    7     │
                   │ Port 8000│              └──────────┘      └──────────┘
                   └──────────┘
                        │
                   ┌──────────┐
                   │ BullMQ   │
                   │ Workers  │───▶ Resend (Email)
                   └──────────┘
```

## Pre-Deployment Checklist

- [ ] All CI checks pass (lint, typecheck, test, build)
- [ ] PR reviewed and approved
- [ ] Database migrations tested against staging DB
- [ ] No high/critical dependency vulnerabilities
- [ ] Environment variables configured for target environment
- [ ] JWT keys generated and securely deployed
- [ ] Redis connectivity verified
- [ ] PostgreSQL connectivity verified
- [ ] Resend API key valid and tested

## Standard Deployment

### 1. Merge PR to main
Triggers `deploy-production.yml` — validates, builds Docker image, pushes to GHCR.

### 2. Run Database Migrations (if schema changed)
```bash
# Always run migrations BEFORE deploying the new application version
# This ensures backwards-compatible schema changes are applied first
npx drizzle-kit migrate
```

### 3. Deploy Application
Configure your deployment platform (Railway/Render/Fly.io/custom) to pull the latest GHCR image.

### 4. Verify Health
```bash
curl https://your-api.com/health
# Expected: {"status":"ok","timestamp":"..."}
```

## Rollback Procedures

### Application Rollback
1. Redeploy the previous Docker image tag (use SHA-based tag)
2. Verify health check passes
3. Monitor logs for errors

### Database Rollback
> ⚠️ Drizzle ORM does not generate automatic rollback migrations.
> For critical rollbacks, prepare manual SQL reversal scripts BEFORE applying migrations.

### Environment Variable Rollback
If a new env var causes issues:
1. Revert the env var in your deployment platform
2. Redeploy the previous application version
3. Investigate in a non-production environment

## Environment Variables

| Variable | Required | Sensitive | Notes |
|----------|----------|-----------|-------|
| `NODE_ENV` | ✅ | ❌ | `production` for deployed environments |
| `PORT` | ✅ | ❌ | Default: 8000 |
| `DATABASE_URL` | ✅ | ✅ | PostgreSQL connection string with SSL |
| `REDIS_URL` | ✅ | ✅ | Redis connection string |
| `JWT_PRIVATE_KEY_PATH` | ✅ | ✅ | Path to EC private key PEM file |
| `JWT_PUBLIC_KEY_PATH` | ✅ | ✅ | Path to EC public key PEM file |
| `MFA_ENCRYPTION_KEY` | ✅ | ✅ | 64-char hex string for AES-256-GCM |
| `CORS_ORIGINS` | ✅ | ❌ | Comma-separated frontend URLs |
| `RESEND_API_KEY` | ✅ | ✅ | Resend email provider API key |
| `EMAIL_FROM_ADDRESS` | ✅ | ❌ | Sender email address |
| `COOKIE_SECURE` | ✅ | ❌ | Must be `true` in production |
| `APP_URL` | ✅ | ❌ | Public URL of the backend |

## Incident Response

| Severity | Description | Response |
|----------|-------------|----------|
| SEV-1 | Auth bypass, data leak | Immediate rollback, rotate all secrets |
| SEV-2 | API down, auth broken | Rollback within 15 min |
| SEV-3 | Endpoint degraded | Fix forward or rollback |
| SEV-4 | Minor issue | Fix in next deployment |

## Docker Operations

```bash
# Build locally
docker build -t pay-auth .

# Run locally (mount keys, inject env)
docker run -p 8000:8000 \
  --env-file .env \
  -v $(pwd)/keys:/app/keys:ro \
  pay-auth

# Check container health
docker inspect --format='{{.State.Health.Status}}' <container-id>
```
