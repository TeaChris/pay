## Description

<!-- What does this PR do? Why is it needed? -->

## Type of Change

- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 💥 Breaking change
- [ ] 📝 Documentation update
- [ ] ♻️ Refactor
- [ ] 🧪 Test update
- [ ] 🔧 Build / CI changes
- [ ] 🔒 Security fix or hardening
- [ ] 🗃️ Database migration

## Related Issues

<!-- Closes #123, Fixes #456 -->

## Changes Made

-
-
-

## Database Changes

<!-- If this PR includes schema changes or migrations: -->

- [ ] New migration file generated (`npm run db:generate`)
- [ ] Migration tested against fresh database
- [ ] Migration is backwards-compatible (no column drops without deprecation)
- [ ] Rollback procedure documented below

<!-- If no database changes, delete this section. -->

## API Changes

<!-- If this PR modifies API endpoints: -->

- [ ] Endpoint contract is backwards-compatible
- [ ] Request/response schemas updated
- [ ] Frontend SDK compatibility verified
- [ ] Rate limiting configured for new endpoints

<!-- If no API changes, delete this section. -->

## Checklist

### Code Quality
- [ ] Code compiles (`npm run typecheck`)
- [ ] All tests pass (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] New code has tests
- [ ] Commit messages follow Conventional Commits

### Security
- [ ] No secrets or credentials in code
- [ ] No `console.log` of sensitive data (use structured logger)
- [ ] Auth/RBAC changes tested
- [ ] Input validation via Zod schemas
- [ ] New environment variables documented in `.env.example`
- [ ] Audit events logged for sensitive operations

### Financial Safety
- [ ] Money values are string-typed (never `number`)
- [ ] Financial operations include idempotency keys
- [ ] Transaction operations are wrapped in DB transactions
- [ ] Error responses don't leak sensitive information

## Deployment Notes

<!-- Special deployment considerations: env var changes, migration order, feature flags -->

## Additional Context

<!-- Anything else reviewers should know -->
