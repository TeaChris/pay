import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getEnv } from '../../config/env.js';
import * as schema from './schema/index.js';

export type Database = ReturnType<typeof createDb>;

let _pool: pg.Pool | undefined;
let _db: Database | undefined;

export function createDb(url?: string): ReturnType<typeof drizzle<typeof schema>> {
  const connectionUrl = url ?? getEnv().DATABASE_URL;
  const isLocalhost = connectionUrl.includes('localhost') || connectionUrl.includes('127.0.0.1');

  const pool = new pg.Pool({
    connectionString: connectionUrl,
    max: 20,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 30_000,
    ssl: isLocalhost ? undefined : { rejectUnauthorized: getEnv().NODE_ENV === 'production' },
  });

  _pool = pool;
  return drizzle(pool, { schema });
}

export function getDb(): Database {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = undefined;
    _db = undefined;
  }
}
