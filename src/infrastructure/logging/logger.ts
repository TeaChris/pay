import pino from 'pino';
import type { Logger } from 'pino';
import { getEnv } from '../../config/env.js';
import { redactSerializer } from './serializers.js';

export type AppLogger = Logger;

let _logger: AppLogger | undefined;

export function createLogger(): AppLogger {
  const env = getEnv();

  const logger = pino({
    level: env.LOG_LEVEL,
    base: { app: env.APP_NAME, env: env.NODE_ENV },
    serializers: {
      req: redactSerializer,
      res: redactSerializer,
    },
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(env.NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss' },
          },
        }
      : {}),
  });

  return logger;
}

export function getLogger(): AppLogger {
  if (!_logger) {
    _logger = createLogger();
  }
  return _logger;
}

export function createChildLogger(bindings: Record<string, unknown>): AppLogger {
  return getLogger().child(bindings);
}
