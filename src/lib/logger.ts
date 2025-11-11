import { isDev } from './utils';

type LogLevel = 'log' | 'warn' | 'error';

interface LogOptions {
  level?: LogLevel;
  context?: Record<string, any>;
}

const log = (message: string, data?: any, options?: LogOptions) => {
  const { level = 'log', context } = options || {};

  if (isDev()) {
    // In development, log to console with full details
    console[level](message, data, context);
  } else {
    // In production, send to a logging service (placeholder)
    // For now, we'll still console log in production, but this is where
    // you'd integrate with Sentry, LogRocket, etc.
    console[level](message, data, context);
    // Example: sendToLoggingService(message, data, context, level);
  }
};

const logger = {
  log: (message: string, data?: any, options?: Omit<LogOptions, 'level'>) =>
    log(message, data, { ...options, level: 'log' }),
  warn: (message: string, data?: any, options?: Omit<LogOptions, 'level'>) =>
    log(message, data, { ...options, level: 'warn' }),
  error: (message: string, data?: any, options?: Omit<LogOptions, 'level'>) =>
    log(message, data, { ...options, level: 'error' }),
};

export default logger;