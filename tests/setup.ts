import { afterAll, beforeAll } from 'vitest';

// Set test environment variables before any module imports
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3333';
process.env['APP_NAME'] = 'pay-auth-test';
process.env['APP_URL'] = 'http://localhost:3000';
process.env['TRUSTED_PROXIES'] = 'loopback';
process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/pay_auth_test';
process.env['REDIS_URL'] = process.env['TEST_REDIS_URL'] ?? 'redis://localhost:6379/1';
process.env['JWT_PRIVATE_KEY_PATH'] = './keys/ec-private.pem';
process.env['JWT_PUBLIC_KEY_PATH'] = './keys/ec-public.pem';
process.env['JWT_ISSUER'] = 'pay-auth-test';
process.env['JWT_ACCESS_TOKEN_TTL'] = '900';
process.env['JWT_REFRESH_TOKEN_TTL'] = '604800';
process.env['COOKIE_SECURE'] = 'false';
process.env['ARGON2_MEMORY_COST'] = '4096'; // Low for fast tests
process.env['ARGON2_TIME_COST'] = '1';
process.env['ARGON2_PARALLELISM'] = '1';
process.env['CORS_ORIGINS'] = 'http://localhost:3000';
process.env['MFA_ISSUER'] = 'PayTest';
process.env['MFA_ENCRYPTION_KEY'] = 'a'.repeat(64);
process.env['LOG_LEVEL'] = 'fatal';
process.env['RESEND_API_KEY'] = 're_test_fake_key_for_unit_tests';
process.env['EMAIL_FROM_ADDRESS'] = 'test@example.com';
process.env['EMAIL_REPLY_TO'] = 'support@example.com';

beforeAll(async () => {
  // Ensure keys exist for tests
  const { existsSync } = await import('node:fs');
  if (!existsSync('./keys/ec-private.pem')) {
    throw new Error('Test keys not found. Run `npm run generate-keys` first.');
  }

  // Load and validate environment so getEnv() works everywhere
  const { loadEnv } = await import('../src/config/env.js');
  loadEnv();
});

afterAll(async () => {
  // Cleanup connections
  try {
    const { closeEmailWorker } = await import('../src/modules/email/email.worker.js');
    const { closeEmailQueue } = await import('../src/modules/email/email.queue.js');
    const { resetEmailProvider } = await import('../src/infrastructure/email/index.js');
    await closeEmailWorker();
    await closeEmailQueue();
    resetEmailProvider();
  } catch {
    // Email infrastructure may not have been initialized
  }
  try {
    const { closeDb } = await import('../src/infrastructure/db/client.js');
    const { closeRedis } = await import('../src/infrastructure/redis/client.js');
    await closeRedis();
    await closeDb();
  } catch {
    // Connections may not have been opened
  }
});
